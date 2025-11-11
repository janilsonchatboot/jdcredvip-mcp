import { createContext, useContext, ReactNode } from "react";
import { useAuthProvider, type AuthHook } from "@/hooks/useAuth";

const AuthContext = createContext<AuthHook | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthProvider();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthHook {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Alias mantido para compatibilidade com imports antigos
export const useAuthContext = useAuth;
