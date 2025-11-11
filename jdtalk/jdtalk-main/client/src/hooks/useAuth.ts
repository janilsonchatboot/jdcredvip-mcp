import { useState, useEffect, useCallback } from "react";
import { LoginCredentials } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

type User = {
  id: number;
  username: string;
  displayName: string;
  role: string;
};

type AuthTokens = {
  token: string;
  refreshToken: string;
  expiresIn: number; // segundos
  refreshExpiresIn: number; // segundos
  expiresAt?: number; // timestamp quando o token expira
};

export type AuthHook = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

export function useAuthProvider(): AuthHook {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(() => {
    const savedTokens = localStorage.getItem('auth_tokens');
    if (savedTokens) {
      try {
        const parsedTokens = JSON.parse(savedTokens) as AuthTokens;
        // Verificar se o token ainda é válido (margem de 60 segundos)
        if (parsedTokens.expiresAt && parsedTokens.expiresAt > Date.now() + 60000) {
          return parsedTokens;
        }
      } catch (e) {
        console.error('Erro ao parsear tokens salvos:', e);
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const HOME_PATH = "/crm/dashboard";
  const LOGIN_PATH = "/login";

  // Função para atualizar tokens de autenticação
  const updateTokens = useCallback((newTokens: AuthTokens) => {
    // Calcular quando o token expira (timestamp)
    const tokenData = {
      ...newTokens,
      expiresAt: Date.now() + (newTokens.expiresIn * 1000)
    };
    
    // Salvar no estado e localStorage
    setTokens(tokenData);
    localStorage.setItem('auth_tokens', JSON.stringify(tokenData));
  }, []);

  // Função para renovar o token JWT quando expirar
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refreshToken) {
      return false;
    }

    try {
      const response = await apiRequest("POST", "/api/auth/refresh", {
        refresh_token: tokens.refreshToken
      });

      if (response.ok) {
        const data = await response.json();
        updateTokens({
          token: data.token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          refreshExpiresIn: data.refresh_expires_in
        });
        return true;
      }
      
      // Falha na renovação, precisa fazer login novamente
      localStorage.removeItem('auth_tokens');
      setTokens(null);
      setUser(null);
      return false;
    } catch (err) {
      console.error("Token refresh failed:", err);
      localStorage.removeItem('auth_tokens');
      setTokens(null);
      setUser(null);
      return false;
    }
  }, [tokens, updateTokens]);

  // Verificar se o token está expirando em breve
  useEffect(() => {
    if (!tokens?.expiresAt) return;

    // Renovar o token quando estiver a 5 minutos de expirar
    const timeUntilExpiry = tokens.expiresAt - Date.now();
    const refreshTime = 5 * 60 * 1000; // 5 minutos em ms
    
    if (timeUntilExpiry <= refreshTime) {
      refreshToken();
    } else {
      // Agendar a renovação
      const refreshTimerId = setTimeout(() => {
        refreshToken();
      }, timeUntilExpiry - refreshTime);
      
      return () => clearTimeout(refreshTimerId);
    }
  }, [tokens, refreshToken]);

  const handleUnauthenticated = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_tokens");
    if (window.location.pathname !== LOGIN_PATH) {
      setLocation(LOGIN_PATH);
    }
  }, [setLocation]);

  const checkAuth = useCallback(async () => {
    if (!tokens) {
      setIsLoading(false);
      handleUnauthenticated();
      return;
    }

    const requestProfile = () => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
        "X-Requested-With": "XMLHttpRequest"
      };

      if (tokens?.token) {
        headers["Authorization"] = `Bearer ${tokens.token}`;
      }

      return fetch("/api/auth/me", {
        method: "GET",
        headers,
        credentials: "include"
      });
    };

    setIsLoading(true);
    console.log("Verificando autenticação...", window.location.pathname);

    try {
      let response = await requestProfile();

      if (response.ok) {
        const userData = await response.json();
        console.log("Usuário autenticado:", userData);
        setUser(userData);
        localStorage.setItem("auth_role", String(userData.role ?? "promotor"));
        setError(null);

        if (window.location.pathname === LOGIN_PATH) {
          setLocation(HOME_PATH);
        }
      } else if (response.status === 401) {
        handleUnauthenticated();
        return;
      } else {
        console.log("Usuário não autenticado, status:", response.status);
        handleUnauthenticated();
      }
    } catch (err) {
      console.error("Erro ao verificar autenticação:", err);
      handleUnauthenticated();
    } finally {
      setIsLoading(false);
    }
  }, [tokens, refreshToken, handleUnauthenticated]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      // Autenticar com a API direta (não WordPress)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Login falhou. Verifique suas credenciais.");
      }
      
      const userData = await response.json();
      
      // Configurar usuario diretamente da resposta
      setUser({
        id: userData.id,
        username: userData.username,
        displayName: userData.displayName,
        role: userData.role
      });
      if (userData?.token && (userData?.refreshToken || userData?.refresh_token)) {
        updateTokens({
          token: userData.token,
          refreshToken: userData.refreshToken ?? userData.refresh_token,
          expiresIn: userData.expiresIn ?? userData.expires_in ?? 3600,
          refreshExpiresIn: userData.refreshExpiresIn ?? userData.refresh_expires_in ?? 604800
        });
      }
      if (userData?.role) {
        localStorage.setItem("auth_role", String(userData.role));
      } else {
        localStorage.setItem("auth_role", "promotor");
      }
      
      setLocation(HOME_PATH);
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err?.message || "Login falhou. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Enviar solicitação de logout ao servidor
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
      
      // Limpar tokens locais
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_role');
      setTokens(null);
      setUser(null);
      
      // Pequeno atraso para garantir que a sessão foi destruída no servidor
      setTimeout(() => {
        setLocation(LOGIN_PATH);
        setIsLoading(false);
      }, 300);
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
    refreshToken
  };
}
