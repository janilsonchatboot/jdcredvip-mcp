import { Route, Switch, useLocation } from "wouter";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ConversationsPage from "@/pages/conversations";
import SettingsPage from "@/pages/settings";
import PipelinePage from "@/pages/pipeline";
import PluginsPage from "@/pages/plugins";
import DatabasePage from "@/pages/database";
import CmsPage from "@/pages/cms"; // Adicionado
import AccountPage from "@/pages/account";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const [, navigate] = useLocation();
  
  // Executar verificação de autenticação ao montar o componente
  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  console.log("ProtectedRoute - isLoading:", isLoading, "isAuthenticated:", isAuthenticated);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log("Redirecionando para login via ProtectedRoute - useLocation");
    // Usar wouter para navegação ao invés de window.location
    navigate("/login");
    return null;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/conversations" component={() => <ProtectedRoute component={ConversationsPage} />} />
      <Route path="/pipeline" component={() => <ProtectedRoute component={PipelinePage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/plugins" component={() => <ProtectedRoute component={PluginsPage} />} />
      <Route path="/database" component={() => <ProtectedRoute component={DatabasePage} />} />
      <Route path="/cms" component={() => <ProtectedRoute component={CmsPage} />} /> {/* Adicionado */}
      <Route path="/account" component={() => <ProtectedRoute component={AccountPage} />} />
      <Route path="/login" component={LoginPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
