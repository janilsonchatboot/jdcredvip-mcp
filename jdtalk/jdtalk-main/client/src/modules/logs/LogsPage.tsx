import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchIntegrationLogs, IntegrationLog, IntegrationLogFilters } from "@/modules/dashboard/services/dashboard.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/formatters";
import { LogDetailsModal } from "./components/LogDetailsModal";

const STATUS_OPTIONS = ["todos", "sucesso", "alerta", "erro", "info"];

export default function LogsPage() {
  const [filters, setFilters] = useState<{ origem: string; status: string; search: string }>({
    origem: "todos",
    status: "todos",
    search: ""
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryFilters: IntegrationLogFilters = {
    origem: filters.origem !== "todos" ? filters.origem : undefined,
    status: filters.status !== "todos" ? filters.status : undefined,
    search: filters.search || undefined,
    limit,
    offset: (page - 1) * limit
  };

  const { data, isLoading } = useQuery({
    queryKey: ["jdcredvip", "logs", queryFilters],
    queryFn: () => fetchIntegrationLogs(queryFilters),
    keepPreviousData: true,
    refetchInterval: 120_000
  });

  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const [open, setOpen] = useState(false);

  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const exportCsv = () => {
    if (!logs.length) return;
    const header = ["id", "integracao", "acao", "status", "mensagem", "data"];
    const rows = logs.map((log) => [
      log.id,
      log.integracao,
      log.acao,
      log.status,
      (log.mensagem ?? "").replace(/"/g, '""'),
      log.created_at
    ]);
    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-gaia-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tableContent = useMemo(() => {
    if (isLoading) {
      return (
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
              <TableCell colSpan={5}>
                <div className="h-10 w-full rounded bg-muted/40 animate-pulse" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }

    if (!logs.length) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
              Nenhum log encontrado para o filtro selecionado.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="font-medium">{formatDate(log.created_at)}</TableCell>
            <TableCell className="capitalize">{log.integracao}</TableCell>
            <TableCell className="capitalize">{log.acao}</TableCell>
            <TableCell>
              <Badge variant="outline">{log.status}</Badge>
            </TableCell>
            <TableCell className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-muted-foreground">{log.mensagem ?? "—"}</span>
              <Button variant="outline" size="xs" onClick={() => { setSelectedLog(log); setOpen(true); }}>
                Ver
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  }, [isLoading, logs]);

  return (
    <AppLayout title="Central de Logs GAIA">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Central de logs</CardTitle>
              <CardDescription>Auditoria detalhada das integrações Codex, Importação e Nexxo.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filters.origem} onValueChange={(value) => { setFilters((prev) => ({ ...prev, origem: value })); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  {["todos", "codex", "importacao", "nexxo", "yuppie", "workbank"].map((origin) => (
                    <SelectItem key={origin} value={origin}>
                      {origin === "todos" ? "Todos" : origin.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(value) => { setFilters((prev) => ({ ...prev, status: value })); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "todos" ? "Todos" : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Pesquisar por mensagem/ação"
                value={filters.search}
                onChange={(event) => { setFilters((prev) => ({ ...prev, search: event.target.value })); setPage(1); }}
                className="w-60"
              />
              <Button variant="outline" onClick={exportCsv}>
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                {tableContent}
              </Table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Exibindo {logs.length} de {total} registros
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Anterior
                </Button>
                <p className="text-sm">
                  Página {page} de {totalPages}
                </p>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <LogDetailsModal log={selectedLog} open={open} onOpenChange={setOpen} />
    </AppLayout>
  );
}
