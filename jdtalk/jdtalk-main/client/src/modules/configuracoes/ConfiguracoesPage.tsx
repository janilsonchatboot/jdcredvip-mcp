import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchCoreStatus, CoreStatusResponse } from "./services/configuracoes.api";
import { formatDate } from "@/lib/formatters";

const configuracoesLinks = [
  { label: "Bancos", href: "/crm/configuracoes/bancos", description: "Taxas e status dos bancos parceiros." },
  { label: "Promotoras", href: "/crm/configuracoes/promotoras", description: "Cadastro de promotoras e contatos." },
  { label: "Produtos", href: "/crm/configuracoes/produtos", description: "Catálogo de produtos por banco/promotora." }
];

export default function ConfiguracoesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["jdcredvip", "core", "status"],
    queryFn: fetchCoreStatus
  });

  return (
    <AppLayout title="Configurações CRM">
      <div className="p-6 space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Central de configurações</CardTitle>
            <CardDescription>
              Gerencie as tabelas operacionais que alimentam a triagem, metas e integrações.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {configuracoesLinks.map((item) => (
              <div key={item.href} className="border rounded-lg p-4 space-y-2">
                <div>
                  <p className="font-semibold text-text-primary">{item.label}</p>
                  <p className="text-sm text-text-secondary">{item.description}</p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={item.href}>Abrir módulo</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <CoreModulesCard status={data} isLoading={isLoading} />
      </div>
    </AppLayout>
  );
}

function CoreModulesCard({ status, isLoading }: { status: CoreStatusResponse | undefined; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro GAIA · Módulos ativos</CardTitle>
        <CardDescription>
          Versão {status?.version ?? "—"} · manifest atualizado em{" "}
          {status?.manifestUpdatedAt ? formatDate(status.manifestUpdatedAt) : "—"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Módulo</th>
                <th className="py-2">Status</th>
                <th className="py-2">Versão</th>
                <th className="py-2">Endpoints</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    Carregando registro GAIA...
                  </td>
                </tr>
              ) : status?.modules?.length ? (
                status.modules.map((module) => (
                  <tr key={module.id} className="border-t">
                    <td className="py-3">
                      <p className="font-semibold">{module.name}</p>
                      <p className="text-xs text-muted-foreground">{module.description}</p>
                    </td>
                    <td className="py-3 capitalize">{module.status}</td>
                    <td className="py-3">{module.version ?? "—"}</td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {module.endpoints?.length ? module.endpoints.join(", ") : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    Nenhum módulo registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
