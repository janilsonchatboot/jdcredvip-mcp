import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import {
  listarClientes,
  ClientesResponse,
  ClientesFilters,
  DEFAULT_CLIENTES_FILTERS
} from "./services/clientes.api";
import { useDashboardFilter } from "@/contexts/DashboardFilterContext";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { QuickActions } from "@/components/shared/QuickActions";

const formatPercentValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  const percent = value > 1 ? value : value * 100;
  return `${percent.toFixed(2)}%`;
};

export default function ClientesPage() {
  const { dateInicio, dateFim, setDates, clearDates } = useDashboardFilter();
  const [filters, setFilters] = useState<ClientesFilters>({
    ...DEFAULT_CLIENTES_FILTERS,
    dataInicio: dateInicio || "",
    dataFim: dateFim || ""
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isFetching } = useQuery<ClientesResponse>({
    queryKey: [
      "jdcredvip",
      "clientes",
      filters.search,
      filters.promotora,
      filters.origem,
      filters.status,
      filters.dataInicio,
      filters.dataFim,
      page,
      pageSize
    ],
    queryFn: () => listarClientes(filters, page, pageSize)
  });

  const clientes = data?.clientes ?? [];
  const totalClientes = data?.total ?? 0;
  const totalPages = totalClientes === 0 ? 0 : Math.ceil(totalClientes / pageSize);
  const rangeStart = totalClientes === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalClientes === 0 ? 0 : Math.min(page * pageSize, totalClientes);

  const promotorasDisponiveis = data?.promotorasDisponiveis ?? [];
  const origensDisponiveis = data?.origensDisponiveis ?? [];
  const statusDisponiveis = data?.statusDisponiveis ?? [];
  const aggregates = data?.aggregates;
  const totalContratosFiltrados = aggregates?.totalRegistros ?? totalClientes;
  const totalClientesUnicosFiltrados =
    aggregates?.totalClientesUnicos ?? data?.totalClientesUnicos ?? 0;
  const volumeLiquidoTotal = aggregates?.volumeLiquidoTotal ?? 0;
  const volumeBrutoTotal = aggregates?.volumeBrutoTotal ?? 0;
  const comissaoTotal = aggregates?.comissaoTotal ?? 0;

  const atualizarFiltro = <K extends keyof ClientesFilters>(campo: K, valor: ClientesFilters[K]) => {
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
    setPage(1);
  };

  const limparDatas = () => {
    setFilters((prev) => ({
      ...prev,
      dataInicio: "",
      dataFim: ""
    }));
    clearDates();
    setPage(1);
  };

  const handleResetFiltros = () => {
    setFilters({ ...DEFAULT_CLIENTES_FILTERS });
    clearDates();
    setPage(1);
    setPageSize(25);
  };

  useEffect(() => {
    if (totalClientes === 0) {
      if (page !== 1) setPage(1);
      return;
    }
    const paginas = Math.max(1, Math.ceil(totalClientes / pageSize));
    if (page > paginas) {
      setPage(paginas);
    }
  }, [totalClientes, page, pageSize]);

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

  return (
    <AppLayout title="Clientes">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Dados consolidados (Nexxo, Crefaz e importações) com todas as colunas do CRM.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DateRangePicker />
                <Button variant="ghost" size="sm" onClick={limparDatas}>
                  Limpar datas
                </Button>
              </div>
              <QuickActions />
            </div>

            <div className="grid gap-3 lg:grid-cols-4 md:grid-cols-2">
              <Input
                placeholder="Pesquisar por nome ou documento"
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
                  {promotorasDisponiveis.map((promotora) => (
                    <SelectItem key={promotora} value={promotora}>
                      {promotora}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.origem} onValueChange={(value) => atualizarFiltro("origem", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as origens</SelectItem>
                  {origensDisponiveis.map((origem) => (
                    <SelectItem key={origem} value={origem}>
                      {origem}
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
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-secondary">
                {totalClientes === 0
                  ? "Nenhum cliente encontrado para os filtros selecionados."
                  : `Exibindo ${rangeStart}-${rangeEnd} de ${formatNumber(totalClientes)} clientes.`}
              </p>
              <Button variant="outline" size="sm" onClick={handleResetFiltros}>
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard
            label="Contratos (filtro)"
            value={formatNumber(totalContratosFiltrados)}
          />
          <MetricCard
            label="Clientes únicos (filtro)"
            value={formatNumber(totalClientesUnicosFiltrados)}
          />
          <MetricCard
            label="Volume líquido (filtro)"
            value={formatCurrency(volumeLiquidoTotal)}
          />
          <MetricCard
            label="Volume bruto (filtro)"
            value={formatCurrency(volumeBrutoTotal)}
          />
          <MetricCard
            label="Comissão líquida (filtro)"
            value={formatCurrency(comissaoTotal)}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Carteira consolidada</CardTitle>
              <CardDescription>
                {isFetching
                  ? "Atualizando com dados mais recentes..."
                  : `Total no filtro: ${formatNumber(totalContratosFiltrados)} contratos | ${formatNumber(
                      totalClientesUnicosFiltrados
                    )} clientes únicos.`}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Contratos por página</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Quantidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100].map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page <= 1 || totalClientes === 0 || isFetching}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-text-secondary">
                  Página {totalClientes === 0 ? 0 : page} de {totalPages || 0}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={totalClientes === 0 || page >= (totalPages || 0) || isFetching}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : clientes.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nenhum cliente encontrado para os filtros selecionados.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead className="text-right">Volume líquido</TableHead>
                        <TableHead className="text-right">Volume bruto</TableHead>
                        <TableHead>Data pagamento</TableHead>
                        <TableHead>Promotora</TableHead>
                        <TableHead>Contrato ADE</TableHead>
                        <TableHead className="text-right">Comissão ($)</TableHead>
                        <TableHead className="text-right">Comissão (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map((cliente, index) => (
                        <TableRow
                          key={
                            cliente.id ??
                            cliente.contrato ??
                            cliente.contratoAde ??
                            `${cliente.nome}-${cliente.documento ?? index}`
                          }
                        >
                          <TableCell className="align-top">
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary">{cliente.nome}</span>
                              <span className="text-xs text-text-secondary">
                                {cliente.origem
                                  ? `Origem: ${cliente.origem}`
                                  : cliente.promotora
                                  ? `Promotora: ${cliente.promotora}`
                                  : "Sem origem definida"}
                              </span>
                              {cliente.ultimaAtualizacao && (
                                <span className="text-[11px] text-text-secondary">
                                  Atualizado em {formatDate(cliente.ultimaAtualizacao)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">{cliente.documento ?? "--"}</TableCell>
                          <TableCell className="align-top">{cliente.telefone ?? "--"}</TableCell>
                          <TableCell className="align-top">{cliente.produto ?? "--"}</TableCell>
                          <TableCell className="align-top">{cliente.convenio ?? "--"}</TableCell>
                          <TableCell className="align-top">{cliente.banco ?? "--"}</TableCell>
                          <TableCell className="text-right align-top">
                            {formatCurrency(cliente.volumeLiquido)}
                          </TableCell>
                          <TableCell className="text-right align-top">
                            {formatCurrency(cliente.volumeBruto)}
                          </TableCell>
                          <TableCell className="align-top">{formatDate(cliente.dataPagamento)}</TableCell>
                          <TableCell className="align-top">{cliente.promotora ?? "--"}</TableCell>
                          <TableCell className="align-top">
                            {cliente.contratoAde ?? cliente.contrato ?? "--"}
                          </TableCell>
                          <TableCell className="text-right align-top">
                            {formatCurrency(cliente.comissaoLiquida ?? cliente.comissao)}
                          </TableCell>
                          <TableCell className="text-right align-top">
                            {formatPercentValue(cliente.comissaoPercentual)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-text-secondary">
                    {totalClientes === 0
                      ? "Nenhum registro para paginar."
                      : `Mostrando ${rangeStart}-${rangeEnd} de ${formatNumber(totalClientes)} clientes`}
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">Clientes por página</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[25, 50, 100].map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPage((current) => Math.max(current - 1, 1))}
                        disabled={page <= 1 || totalClientes === 0 || isFetching}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-text-secondary">
                        Página {totalClientes === 0 ? 0 : page} de {totalPages || 0}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPage((current) => current + 1)}
                        disabled={totalClientes === 0 || page >= (totalPages || 0) || isFetching}
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
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
