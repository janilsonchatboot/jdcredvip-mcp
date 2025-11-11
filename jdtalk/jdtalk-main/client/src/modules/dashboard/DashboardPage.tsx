import { Suspense } from "react";
import AppLayout from "@/components/AppLayout";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { MetricsCards } from "./components/MetricsCards";
import { ProductsChart } from "./components/ProductsChart";
import { QuickActions } from "@/components/shared/QuickActions";
import { TopPromotoras } from "./components/TopPromotoras";
import { TrendWidget } from "./components/TrendWidget";
import { LogsPanel } from "./components/LogsPanel";
import { useGlobalDashboardData } from "./hooks/useDashboardData";
import type { DashboardDataResult } from "./hooks/useDashboardData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { IntegrationResumo } from "./services/dashboard.api";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 rounded border bg-muted/10 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 rounded border bg-muted/10 animate-pulse" />
        <div className="h-80 rounded border bg-muted/10 animate-pulse" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { meta, insights, ranking, trend, integracoes } = useGlobalDashboardData();
  const produtos = insights?.charts?.porProduto ?? [];
  const topPromotoras = ranking?.ranking?.promotoras ?? [];
  const importacoes = insights?.importacoes ?? null;

  return (
    <div className="space-y-6">
      <MetricsCards metrics={insights?.metrics ?? null} comparison={insights?.comparison ?? null} />

      <section className="grid gap-4 lg:grid-cols-2">
        <ProductsChart data={produtos.slice(0, 5)} />
        <TopPromotoras items={topPromotoras.slice(0, 5)} />
      </section>

      <TrendWidget data={trend} />

      <section className="grid gap-4 lg:grid-cols-2">
        <LogsPanel />
        <ImportacoesCard importacoes={importacoes} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MetaOverviewCard meta={meta} />
        <IntegracoesResumoCard resumo={integracoes} />
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard GAIA">
      <div className="p-6 space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">JD CRED VIP · GAIA Core</h1>
            <p className="text-sm text-muted-foreground">
              Painel inteligente com indicadores consolidados, logs e tendências em tempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <DateRangePicker />
            <QuickActions />
          </div>
        </header>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </AppLayout>
  );
}

type InsightsData = DashboardDataResult["insights"];

function ImportacoesCard({ importacoes }: { importacoes: InsightsData["importacoes"] | null }) {
  const recentes = importacoes?.recentes ?? [];
  const resumo = importacoes?.resumo;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importações processadas</CardTitle>
        <CardDescription>Status dos arquivos analisados pelo Codex.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resumo ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Arquivos</p>
              <p className="text-xl font-semibold">{resumo.totalArquivos}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Volume total</p>
              <p className="text-xl font-semibold">{formatCurrency(resumo.volumeTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Comissão total</p>
              <p className="text-xl font-semibold">{formatCurrency(resumo.comissaoTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Promotoras</p>
              <p className="text-xl font-semibold">{resumo.promotoras.length}</p>
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          {recentes.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded border p-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{item.filename}</p>
                <Badge variant="outline">{item.promotora}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Processado em {formatDate(item.createdAt)}</p>
            </div>
          ))}
          {!recentes.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma importação recente.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MetaOverviewCard({ meta }: { meta: DashboardDataResult["meta"] }) {
  if (!meta?.meta) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meta publicada</CardTitle>
          <CardDescription>
            Nenhuma meta ativa neste período. Exibindo dados reais consolidados.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const mensagem =
    typeof meta.meta.metadata?.mensagem === "string" ? meta.meta.metadata.mensagem : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.meta.titulo}</CardTitle>
        <CardDescription>
          Referência {formatDate(meta.meta.dataReferencia)} • Publicada por {meta.meta.publicadoPor}
        </CardDescription>
        {mensagem ? <p className="text-xs text-muted-foreground">{mensagem}</p> : null}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Indicador</TableHead>
              <TableHead className="text-right">Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Contratos</TableCell>
              <TableCell className="text-right">{formatNumber(meta.meta.metrics.totalContratos)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Volume líquido</TableCell>
              <TableCell className="text-right">{formatCurrency(meta.meta.metrics.volumeLiquido)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Comissão</TableCell>
              <TableCell className="text-right">{formatCurrency(meta.meta.metrics.comissaoTotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
function IntegracoesResumoCard({ resumo }: { resumo: IntegrationResumo | undefined }) {
  const stats = resumo?.resumo;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integradores monitorados</CardTitle>
        <CardDescription>Resumo das principais rotinas (Crefaz / Nexxo).</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs uppercase">Propostas Crefaz</p>
          <p className="text-2xl font-semibold">{formatNumber(stats?.propostasCrefaz ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase">Contratos Nexxo</p>
          <p className="text-2xl font-semibold">{formatNumber(stats?.contratosNexxo ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase">Comissões Nexxo</p>
          <p className="text-2xl font-semibold">{formatNumber(stats?.comissoesNexxo ?? 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase">Volume importado</p>
          <p className="text-2xl font-semibold">{formatCurrency(stats?.volumeImportado ?? 0)}</p>
        </div>
      </CardContent>
    </Card>
  );
}


