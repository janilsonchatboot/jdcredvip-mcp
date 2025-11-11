import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { backendJson } from "@/lib/jdcredvip";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type IntegrationLog = {
  id: number;
  integracao: string;
  acao: string;
  status: string;
  mensagem: string | null;
  detalhes: Record<string, unknown> | null;
  created_at: string;
};

type IntegrationResumo = {
  resumo: {
    propostasCrefaz: number;
    contratosNexxo: number;
    comissoesNexxo: number;
  };
  logsRecentes: IntegrationLog[];
};

type CrefazProposta = {
  id: number;
  status: string;
  clienteNome: string;
  clienteDocumento: string;
  produto: string;
  promotora: string;
  valorSolicitado: number;
  valorLiquido: number;
  prazo: number;
  esteiraUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

type NexxoContrato = {
  id: number;
  contratoId: string;
  clienteNome: string;
  produto: string;
  status: string;
  valorBruto: number;
  valorLiquido: number;
  promotora: string;
  dataContratacao: string;
  atualizadoEm: string;
};

type NexxoComissao = {
  id: number;
  referencia: string;
  promotora: string;
  produto: string;
  valor: number;
  criadoEm: string;
};

export default function IntegrationsPage() {
  const [mostrarPropostas, setMostrarPropostas] = useState(false);
  const [mostrarContratos, setMostrarContratos] = useState(false);
  const [mostrarComissoes, setMostrarComissoes] = useState(false);

  const { data: resumo, isLoading } = useQuery<IntegrationResumo>({
    queryKey: ["jdcredvip", "integracoes", "status"],
    queryFn: () => backendJson<IntegrationResumo>("/integracoes/status"),
    refetchInterval: 60_000,
  });

  const { data: propostas, isLoading: loadingPropostas } = useQuery<CrefazProposta[]>({
    queryKey: ["jdcredvip", "integracoes", "crefaz", { limit: 25 }],
    queryFn: () => backendJson<CrefazProposta[]>("/integracoes/crefaz/propostas?limit=25"),
    enabled: mostrarPropostas,
    refetchInterval: 120_000,
  });

  const { data: contratos, isLoading: loadingContratos } = useQuery<NexxoContrato[]>({
    queryKey: ["jdcredvip", "integracoes", "nexxo", "contratos", { limit: 25 }],
    queryFn: () => backendJson<NexxoContrato[]>("/integracoes/nexxo/contratos?limit=25"),
    enabled: mostrarContratos,
    refetchInterval: 180_000,
  });

  const { data: comissoes, isLoading: loadingComissoes } = useQuery<NexxoComissao[]>({
    queryKey: ["jdcredvip", "integracoes", "nexxo", "comissoes", { limit: 50 }],
    queryFn: () => backendJson<NexxoComissao[]>("/integracoes/nexxo/comissoes?limit=50"),
    enabled: mostrarComissoes,
    refetchInterval: 300_000,
  });

  return (
    <AppLayout title="Painel de integrações">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Integrações MCP</h1>
          <p className="text-text-secondary">
            Acompanhe a saúde das integrações com Crefaz e Nexxo, visualize dados sincronizados e últimos logs registrados.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-8 w-24" />
              </Card>
            ))
          ) : (
            <>
              <SummaryCard
                title="Propostas Crefaz"
                value={formatNumber(resumo?.resumo.propostasCrefaz ?? 0)}
                description="Registros acumulados na base MCP."
              />
              <SummaryCard
                title="Contratos Nexxo"
                value={formatNumber(resumo?.resumo.contratosNexxo ?? 0)}
                description="Contratos sincronizados pela rotina."
              />
              <SummaryCard
                title="Comissões Nexxo"
                value={formatNumber(resumo?.resumo.comissoesNexxo ?? 0)}
                description="Lançamentos de comissão armazenados."
              />
            </>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Propostas Crefaz</CardTitle>
                <CardDescription>Últimas propostas recebidas e seu status.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMostrarPropostas((prev) => !prev)}>
                {mostrarPropostas ? "Esconder" : "Carregar"}
              </Button>
            </CardHeader>
            <CardContent>
              {!mostrarPropostas ? (
                <p className="text-sm text-text-secondary">Clique em carregar para visualizar até 25 propostas recentes.</p>
              ) : loadingPropostas ? (
                <Skeleton className="h-48 w-full" />
              ) : propostas?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propostas.map((proposta) => (
                      <TableRow key={proposta.id}>
                        <TableCell>
                          <div className="font-medium">{proposta.clienteNome}</div>
                          <div className="text-xs text-text-secondary">{proposta.clienteDocumento}</div>
                        </TableCell>
                        <TableCell>{proposta.produto}</TableCell>
                        <TableCell>
                          <Badge variant={proposta.status === "simulado" ? "outline" : "default"} className="uppercase">
                            {proposta.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(proposta.valorLiquido)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-text-secondary">Nenhuma proposta encontrada.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Contratos Nexxo</CardTitle>
                <CardDescription>Dados sincronizados e status das operações.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMostrarContratos((prev) => !prev)}>
                {mostrarContratos ? "Esconder" : "Carregar"}
              </Button>
            </CardHeader>
            <CardContent>
              {!mostrarContratos ? (
                <p className="text-sm text-text-secondary">Carregue para visualizar os últimos contratos importados.</p>
              ) : loadingContratos ? (
                <Skeleton className="h-48 w-full" />
              ) : contratos?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((contrato) => (
                      <TableRow key={contrato.id}>
                        <TableCell>
                          <div className="font-medium">{contrato.contratoId}</div>
                          <div className="text-xs text-text-secondary">{formatDate(contrato.dataContratacao)}</div>
                        </TableCell>
                        <TableCell>{contrato.clienteNome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">
                            {contrato.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(contrato.valorLiquido)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-text-secondary">Nenhum contrato encontrado.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Comissões Nexxo</CardTitle>
                <CardDescription>Últimos lançamentos armazenados por referência.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMostrarComissoes((prev) => !prev)}>
                {mostrarComissoes ? "Esconder" : "Carregar"}
              </Button>
            </CardHeader>
            <CardContent>
              {!mostrarComissoes ? (
                <p className="text-sm text-text-secondary">Carregue para acompanhar valores de comissão registrados.</p>
              ) : loadingComissoes ? (
                <Skeleton className="h-48 w-full" />
              ) : comissoes?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referência</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Valor (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoes.map((comissao) => (
                      <TableRow key={comissao.id}>
                        <TableCell>
                          <div className="font-medium">{comissao.referencia}</div>
                          <div className="text-xs text-text-secondary">Promotora {comissao.promotora}</div>
                        </TableCell>
                        <TableCell>{comissao.produto}</TableCell>
                        <TableCell className="text-right">{formatCurrency(comissao.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-text-secondary">Nenhuma comissão encontrada.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs recentes</CardTitle>
              <CardDescription>Acompanhamento das últimas ações registradas pelo MCP.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : resumo?.logsRecentes?.length ? (
                <div className="space-y-3">
                  {resumo.logsRecentes.map((log) => (
                    <div key={log.id} className="border border-neutral-medium rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          {log.integracao}
                        </span>
                        <Badge variant={log.status === "sucesso" ? "outline" : "destructive"} className="uppercase">
                          {log.status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-text-primary">
                        <strong>{log.acao}</strong> {log.mensagem ? `• ${log.mensagem}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">{formatDate(log.created_at)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Nenhum log encontrado.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
};

const SummaryCard = ({ title, value, description }: SummaryCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <span className="text-2xl font-semibold text-text-primary">{value}</span>
    </CardContent>
  </Card>
);
