import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRankingResumo, RankingResumo } from "./services/ranking.api";

export default function RankingPage() {
  const { data, isLoading } = useQuery<RankingResumo>({
    queryKey: ["jdcredvip", "dashboard", "ranking"],
    queryFn: () => fetchRankingResumo(),
    refetchInterval: 60_000
  });

  const ranking = data?.ranking;

  return (
    <AppLayout title="Ranking Operacional">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo operacional</CardTitle>
            <CardDescription>
              Indicadores consolidados das promotoras, produtos e comissoes em tempo quase real.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full md:col-span-4" />
            ) : data ? (
              <>
                <Metric label="Contratos sincronizados" value={formatNumber(data.metrics.totalContratos)} />
                <Metric label="Volume liquido" value={formatCurrency(data.metrics.volumeLiquido)} />
                <Metric label="Volume bruto" value={formatCurrency(data.metrics.volumeBruto)} />
                <Metric label="Comissoes consolidadas" value={formatCurrency(data.metrics.comissaoTotal)} />
              </>
            ) : (
              <p className="text-sm text-text-secondary md:col-span-4">
                Sem dados suficientes para montar o resumo.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <RankingTable
            title="Promotoras por volume"
            description="Ranking das promotoras com maior volume liquido consolidado."
            loading={isLoading}
            headers={["Posicao", "Promotora", "Contratos", "Volume liquido", "Ticket medio"]}
            rows={ranking?.promotoras?.map((item, index) => [
              `#${index + 1}`,
              item.nome,
              formatNumber(item.totalContratos),
              formatCurrency(item.volumeLiquido),
              formatCurrency(item.ticketMedio)
            ])}
          />

          <RankingTable
            title="Produtos por volume"
            description="Top 5 linhas de crédito com volume, quantidade e comiss��o no período filtrado."
            loading={isLoading}
            headers={[
              "Posicao",
              "Produto",
              "Contratos",
              "Volume liquido",
              "Volume bruto",
              "Comissao"
            ]}
            rows={ranking?.produtos?.map((item, index) => [
              `#${index + 1}`,
              item.nome,
              formatNumber(item.totalContratos),
              formatCurrency(item.volumeLiquido),
              formatCurrency(item.volumeBruto),
              formatCurrency(item.comissaoTotal)
            ])}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RankingTable
            title="Comissoes por promotora"
            description="Total de comissoes registradas por promotora."
            loading={isLoading}
            headers={["Posicao", "Promotora", "Comissao acumulada"]}
            rows={ranking?.comissoes?.map((item, index) => [
              `#${index + 1}`,
              item.promotora,
              formatCurrency(item.comissaoTotal)
            ])}
          />

          <RankingTable
            title="Status operacional"
            description="Distribuicao de contratos por status."
            loading={isLoading}
            headers={["Status", "Contratos", "Volume liquido"]}
            rows={ranking?.status?.map((item) => [
              item.status,
              formatNumber(item.totalContratos),
              formatCurrency(item.volumeLiquido)
            ])}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Importacoes monitoradas</CardTitle>
            <CardDescription>Resumo das importacoes processadas pelo Codex.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-text-secondary space-y-2">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : data?.importacoes ? (
              <>
                <p>Total de arquivos: {formatNumber(data.importacoes.resumo.totalArquivos)}</p>
                <p>Volume consolidado: {formatCurrency(data.importacoes.resumo.volumeTotal)}</p>
                <p>Comissao consolidada: {formatCurrency(data.importacoes.resumo.comissaoTotal)}</p>
                <p>
                  Promotoras envolvidas:{" "}
                  {data.importacoes.resumo.promotoras.length
                    ? data.importacoes.resumo.promotoras.join(", ")
                    : "Nenhuma promotora registrada"}
                </p>
              </>
            ) : (
              <p>Nenhuma importacao registrada ate o momento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

type MetricProps = {
  label: string;
  value: string;
};

const Metric = ({ label, value }: MetricProps) => (
  <div className="rounded border border-neutral-medium p-4 space-y-1">
    <p className="text-xs uppercase text-text-secondary">{label}</p>
    <p className="text-lg font-semibold text-text-primary">{value}</p>
  </div>
);

type RankingTableProps = {
  title: string;
  description: string;
  loading: boolean;
  headers: string[];
  rows?: string[][];
};

const RankingTable = ({ title, description, loading, headers, rows }: RankingTableProps) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows && rows.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((cols, rowIndex) => (
              <TableRow key={`row-${rowIndex}`}>
                {cols.map((col, colIndex) => (
                  <TableCell key={`row-${rowIndex}-col-${colIndex}`}>{col}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-text-secondary">Nenhum dado disponivel para esta tabela.</p>
      )}
    </CardContent>
  </Card>
);
