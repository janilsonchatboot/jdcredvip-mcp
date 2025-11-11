import { Route, Switch, useLocation } from "wouter";
import React, { lazy, Suspense } from "react";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ConversationsPage from "@/pages/conversations";
import SettingsPage from "@/pages/settings";
import PipelinePage from "@/pages/pipeline";
import PluginsPage from "@/pages/plugins";
import DatabasePage from "@/pages/database";
import CmsPage from "@/pages/cms";
import AccountPage from "@/pages/account";
import TriagemPage from "@/pages/triagem";
import IntegrationsPage from "@/pages/integrations";
import { useAuth } from "@/contexts/AuthContext";

const DashboardPage = lazy(() => import("@/modules/dashboard/DashboardPage"));
const ClientesPage = lazy(() => import("@/modules/clientes/ClientesPage"));
const ContratosPage = lazy(() => import("@/modules/contratos/ContratosPage"));
const FollowupsPage = lazy(() => import("@/modules/followups/FollowupsPage"));
const RankingPage = lazy(() => import("@/modules/ranking/RankingPage"));
const MetasPage = lazy(() => import("@/modules/metas/MetasPage"));
const ImportacaoPage = lazy(() => import("@/modules/importacao/ImportacaoPage"));
const ConfiguracoesPage = lazy(() => import("@/modules/configuracoes/ConfiguracoesPage"));
const ConfigBancosPage = lazy(() => import("@/modules/configuracoes/ConfigBancosPage"));
const ConfigPromotorasPage = lazy(() => import("@/modules/configuracoes/ConfigPromotorasPage"));
const ConfigProdutosPage = lazy(() => import("@/modules/configuracoes/ConfigProdutosPage"));
const LogsPage = lazy(() => import("@/modules/logs/LogsPage"));

type ProtectedRouteProps = {
  component: React.ComponentType<any>;
  allowedRoles?: string[];
};

function ProtectedRoute({ component: Component, allowedRoles, ...rest }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuth();
  const [, navigate] = useLocation();

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  if (allowedRoles && allowedRoles.length) {
    const currentRole = user?.role ?? "promotor";
    if (!allowedRoles.includes(currentRole)) {
      navigate("/");
      return null;
    }
  }

  return <Component {...rest} />;
}

const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
  </div>
);

export function AppRouter() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
        <Switch>
          <Route path="/" component={() => <ProtectedRoute component={DashboardPage} />} />
          <Route path="/crm/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
          <Route path="/crm/triagem" component={() => <ProtectedRoute component={TriagemPage} />} />
          <Route path="/crm/metas" component={() => <ProtectedRoute component={MetasPage} />} />
          <Route path="/crm/integracoes" component={() => <ProtectedRoute component={IntegrationsPage} />} />
          <Route path="/crm/clientes" component={() => <ProtectedRoute component={ClientesPage} />} />
          <Route path="/crm/contratos" component={() => <ProtectedRoute component={ContratosPage} />} />
          <Route path="/crm/followups" component={() => <ProtectedRoute component={FollowupsPage} />} />
          <Route path="/crm/ranking" component={() => <ProtectedRoute component={RankingPage} />} />
          <Route
            path="/crm/importacao"
            component={() => <ProtectedRoute component={ImportacaoPage} allowedRoles={["admin"]} />}
          />
          <Route
            path="/crm/configuracoes"
            component={() => <ProtectedRoute component={ConfiguracoesPage} allowedRoles={["admin"]} />}
          />
          <Route
            path="/crm/configuracoes/bancos"
            component={() => <ProtectedRoute component={ConfigBancosPage} allowedRoles={["admin"]} />}
          />
          <Route
            path="/crm/configuracoes/promotoras"
            component={() => <ProtectedRoute component={ConfigPromotorasPage} allowedRoles={["admin"]} />}
          />
          <Route
            path="/crm/configuracoes/produtos"
            component={() => <ProtectedRoute component={ConfigProdutosPage} allowedRoles={["admin"]} />}
          />
          <Route
            path="/crm/logs"
            component={() => <ProtectedRoute component={LogsPage} allowedRoles={["admin"]} />}
          />
          <Route path="/conversations" component={() => <ProtectedRoute component={ConversationsPage} />} />
          <Route path="/pipeline" component={() => <ProtectedRoute component={PipelinePage} />} />
          <Route path="/triagem" component={() => <ProtectedRoute component={TriagemPage} />} />
          <Route path="/metas" component={() => <ProtectedRoute component={MetasPage} />} />
          <Route path="/integracoes" component={() => <ProtectedRoute component={IntegrationsPage} />} />
          <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
          <Route path="/plugins" component={() => <ProtectedRoute component={PluginsPage} allowedRoles={["admin"]} />} />
          <Route path="/database" component={() => <ProtectedRoute component={DatabasePage} allowedRoles={["admin"]} />} />
          <Route path="/cms" component={() => <ProtectedRoute component={CmsPage} allowedRoles={["admin"]} />} />
          <Route path="/account" component={() => <ProtectedRoute component={AccountPage} />} />
          <Route path="/login" component={LoginPage} />
          <Route component={NotFound} />
        </Switch>
    </Suspense>
  );
}
