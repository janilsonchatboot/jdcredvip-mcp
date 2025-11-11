import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { listarContratos, Contrato } from "./services/contratos.api";
import { useDashboardFilter } from "@/contexts/DashboardFilterContext";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { QuickActions } from "@/components/shared/QuickActions";

type Filters = {
  search: string;
  promotora: string;
  status: string;
  produto: string;
  dataInicio: string;
  dataFim: string;
};

const DEFAULT_FILTERS: Filters = {
  search: "",
  promotora: "todos",
  status: "todos",
  produto: "todos",
  dataInicio: "",
  dataFim: ""
};

const STATUS_LABELS: Record<string, string> = {
  aprovado: "Aprovado",
  em_analise: "Em análise",
  aguardando: "Aguardando",
  cancelado: "Cancelado",
  pago: "Pago",
  desconhecido: "Desconhecido"
};

type Resume = {
  volumeLiquido: number;
  volumeBruto: number;
  totalContratos: number;
  ticketMedio: number;
};

const resumeContratos = (contratos: Contrato[]): Resume => {
  if (!contratos.length) {
    return {
      volumeLiquido: 0,
      volumeBruto: 0,
      totalContratos: 0,
      ticketMedio: 0
    };
  }

  const totals = contratos.reduce(
    (acc, contrato) => {
      acc.volumeLiquido += contrato.valorLiquido;
      acc.volumeBruto += contrato.valorBruto;
      acc.totalContratos += 1;
      return acc;
    },
    { volumeLiquido: 0, volumeBruto: 0, totalContratos: 0 }
  );

  return {
    ...totals,
    ticketMedio: totals.totalContratos ? totals.volumeLiquido / totals.totalContratos : 0
  };
};

export default function ContratosPage() {
  const { dateInicio, dateFim, setDates, clearDates } = useDashboardFilter();
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    dataInicio: dateInicio || "",
    dataFim: dateFim || ""
  });
  const { data, isLoading, isFetching } = useQuery<Contrato[]>({
    queryKey: [
      "jdcredvip",
      "contratos",
      filters.search,
      filters.promotora,
      filters.status,
      filters.produto,
      filters.dataInicio,
      filters.dataFim
    ],
    queryFn: () =>
      listarContratos({
        search: filters.search,
        promotora: filters.promotora,
        status: filters.status,
        produto: filters.produto,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined
      })
  });

  const contratos = data ?? [];
  const resumo = useMemo(() => resumeContratos(contratos), [contratos]);

  const promotoras = useMemo(() => {
    const valores = new Set<string>();
    contratos.forEach((contrato) => {
      if (contrato.promotora) valores.add(contrato.promotora);
    });
    return Array.from(valores).sort();
  }, [contratos]);

  const produtos = useMemo(() => {
    const valores = new Set<string>();
    contratos.forEach((contrato) => {
      if (contrato.produto) valores.add(contrato.produto);
    });
    return Array.from(valores).sort();
  }, [contratos]);

  useEffect(() => {
    const normalizedInicio = dateInicio || "";
    const normalizedFim = dateFim || "";
    setFilters((prev) => {
      if (prev.dataInicio === normalizedInicio && prev.dataFim === normalizedFim) {
        return prev;
      }
      return {
        ...prev,
        dataInicio: normalizedInicio,
        dataFim: normalizedFim
      };
    });
  }, [dateInicio, dateFim]);

  const statusDisponiveis = useMemo(() => {
    const valores = new Set<string>();
    contratos.forEach((contrato) => {
      if (contrato.status) valores.add(contrato.status);
    });
    return Array.from(valores).sort();
  }, [contratos]);

  const atualizarFiltro = <K extends keyof Filters>(campo: K, valor: Filters[K]) => {
    setFilters((prev) => {
      const next = {
        ...prev,
        [campo]: valor
      };
      if (campo === "dataInicio" || campo === "dataFim") {
        setDates(next.dataInicio || "", next.dataFim || "");
      }
      return next;
    });
  };

  const limparDatas = () => {
    setFilters((prev) => ({
      ...prev,
      dataInicio: "",
      dataFim: ""
    }));
    clearDates();
  };

  const limparFiltros = () => {
    setFilters({ ...DEFAULT_FILTERS });
    clearDates();
  };

  return (
    <AppLayout title="Contratos">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contratos</CardTitle>
            <CardDescription>
              Contratos sincronizados das integracoes Nexxo, com filtros rápidos por promotora, produto e status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DateRangePicker />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparDatas}
                  disabled={!filters.dataInicio && !filters.dataFim}
                >
                  Limpar datas
                </Button>
              </div>
              <QuickActions />
            </div>

            <div className="grid gap-3 lg:grid-cols-4 md:grid-cols-2">
              <Input
                placeholder="Buscar por cliente ou contrato"
                value={filters.search}
                onChange={(event) => atualizarFiltro("search", event.target.value)}
              />
              <Select
                value={filters.promotora}
                onValueChange={(value) => atualizarFiltro("promotora", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Promotora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as promotoras</SelectItem>
                  {promotoras.map((promotora) => (
                    <SelectItem key={promotora} value={promotora}>
                      {promotora}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.produto} onValueChange={(value) => atualizarFiltro("produto", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto} value={produto}>
                      {produto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(value) => atualizarFiltro("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {statusDisponiveis.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status] ?? status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                {isFetching
                  ? "Atualizando com dados recentes..."
                  : `Total carregado: ${formatNumber(contratos.length)} contratos.`}
              </span>
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Contratos exibidos" value={formatNumber(resumo.totalContratos)} />
          <MetricCard label="Volume líquido" value={formatCurrency(resumo.volumeLiquido)} />
          <MetricCard label="Volume bruto" value={formatCurrency(resumo.volumeBruto)} />
          <MetricCard label="Ticket médio" value={formatCurrency(resumo.ticketMedio)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de contratos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : contratos.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum contrato encontrado para os filtros selecionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Promotora</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Volume líquido</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Contratação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((contrato) => (
                      <TableRow key={contrato.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-text-primary">{contrato.contratoId}</span>
                            {contrato.atualizadoEm && (
                              <span className="text-[11px] text-text-secondary">
                                Atualizado {formatDate(contrato.atualizadoEm)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{contrato.clienteNome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{contrato.promotora}</Badge>
                        </TableCell>
                        <TableCell>{contrato.produto}</TableCell>
                        <TableCell className="text-right">{formatCurrency(contrato.valorLiquido)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{STATUS_LABELS[contrato.status] ?? contrato.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {contrato.dataContratacao ? formatDate(contrato.dataContratacao) : "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
};

const MetricCard = ({ label, value }: MetricCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
    </CardHeader>
    <CardContent>
      <span className="text-2xl font-semibold text-text-primary">{value}</span>
    </CardContent>
  </Card>
);
