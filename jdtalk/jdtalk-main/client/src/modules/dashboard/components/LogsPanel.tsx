import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchIntegrationLogs, IntegrationLog } from "../services/dashboard.api";
import { formatDate } from "@/lib/formatters";
import { Activity, Bot, Cable, UploadCloud, Sparkles, Building2 } from "lucide-react";
import { LogDetailsModal } from "@/modules/logs/components/LogDetailsModal";
import { Link } from "wouter";

const ORIGINS = [
  { label: "Todos", value: "todos" },
  { label: "Codex", value: "codex" },
  { label: "Importação", value: "importacao" },
  { label: "Nexxo", value: "nexxo" },
  { label: "Yuppie", value: "yuppie" },
  { label: "WorkBank", value: "workbank" }
];

const STATUS_COLOR: Record<string, string> = {
  sucesso: "bg-emerald-100 text-emerald-700",
  alerta: "bg-amber-100 text-amber-700",
  erro: "bg-rose-100 text-rose-700",
  info: "bg-blue-100 text-blue-700"
};

const ORIGIN_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  codex: Bot,
  importacao: UploadCloud,
  nexxo: Cable,
  yuppie: Sparkles,
  workbank: Building2
};

const getOriginIcon = (origin?: string) => {
  const key = origin?.toLowerCase() ?? "";
  const Icon = ORIGIN_ICON[key] ?? Activity;
  return <Icon className="h-4 w-4" />;
};

export function LogsPanel() {
  const [origin, setOrigin] = useState("todos");
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["jdcredvip", "logs", origin],
    queryFn: () =>
      fetchIntegrationLogs({
        origem: origin !== "todos" ? origin : undefined,
        limit: 6
      }),
    refetchInterval: 60_000
  });

  const logs = data?.items ?? [];

  const handleSelectLog = (log: IntegrationLog) => {
    setSelectedLog(log);
    setOpen(true);
  };

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`log-skeleton-${index}`} className="h-16 rounded border animate-pulse bg-muted/40" />
          ))}
        </div>
      );
    }
    if (!logs.length) {
      return <p className="text-sm text-muted-foreground">Nenhum log encontrado para o filtro selecionado.</p>;
    }
    return (
      <ul className="space-y-3">
        {logs.map((log) => {
          const statusClass = STATUS_COLOR[log.status] ?? "bg-muted text-foreground";
          const originContext = log.detalhes?.context?.origin || log.detalhes?.origin || log.integracao;
          return (
            <li key={log.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">{getOriginIcon(originContext)}</div>
                  <div>
                    <p className="font-semibold capitalize">
                      {log.integracao} · {log.acao}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                  </div>
                </div>
                <Badge className={statusClass}>{log.status}</Badge>
              </div>
              {log.mensagem ? <p className="mt-2 text-sm text-muted-foreground">{log.mensagem}</p> : null}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Origem: {originContext?.toString().toUpperCase() ?? "N/A"}
                </span>
                <Button variant="outline" size="xs" onClick={() => handleSelectLog(log)}>
                  Ver detalhes
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }, [isLoading, logs]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Logs recentes</CardTitle>
          <CardDescription>Acompanhe eventos das integrações GAIA.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={origin} onValueChange={setOrigin}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              {ORIGINS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="ghost" size="sm">
            <Link href="/crm/logs">Central de logs</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
      <LogDetailsModal log={selectedLog} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
