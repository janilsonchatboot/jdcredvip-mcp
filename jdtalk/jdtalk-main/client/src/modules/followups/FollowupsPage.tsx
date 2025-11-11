import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatNumber } from "@/lib/formatters";
import {
  createFollowup,
  listFollowups,
  updateFollowup,
  Followup,
  FollowupFilters
} from "./services/followups.api";

const DEFAULT_FILTERS: FollowupFilters & { status: string; responsavel: string } = {
  status: "todos",
  responsavel: "todos",
  busca: ""
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluido",
  cancelado: "Cancelado"
};

const formatDateTime = (value: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

type FollowupForm = {
  clienteNome: string;
  clienteDocumento: string;
  contato: string;
  responsavel: string;
  dataAgendada: string;
  descricao: string;
};

const DEFAULT_FORM: FollowupForm = {
  clienteNome: "",
  clienteDocumento: "",
  contato: "",
  responsavel: "",
  dataAgendada: "",
  descricao: ""
};

export default function FollowupsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [form, setForm] = useState<FollowupForm>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isFetching } = useQuery<Followup[]>({
    queryKey: ["jdcredvip", "followups", filters.status, filters.responsavel, filters.busca],
    queryFn: () =>
      listFollowups({
        status: filters.status,
        responsavel: filters.responsavel,
        busca: filters.busca?.trim()
      })
  });

  const followups = data ?? [];

  const responsaveis = useMemo(() => {
    const values = new Set<string>();
    followups.forEach((item) => {
      if (item.responsavel) values.add(item.responsavel);
    });
    return Array.from(values).sort();
  }, [followups]);

  const atualizarFiltro = <K extends keyof Filters>(campo: K, valor: Filters[K]) => {
    setFilters((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const resetForm = () => setForm(DEFAULT_FORM);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const payload = {
        clienteNome: form.clienteNome,
        clienteDocumento: form.clienteDocumento || null,
        contato: form.contato || null,
        responsavel: form.responsavel || null,
        descricao: form.descricao || null,
        dataAgendada: form.dataAgendada ? new Date(form.dataAgendada).toISOString() : undefined,
        status: "pendente"
      } as const;
      await createFollowup(payload);
      toast({ description: "Follow-up registrado com sucesso." });
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "followups"] });
    } catch (error) {
      console.error(error);
      toast({
        description: error instanceof Error ? error.message : "Falha ao registrar follow-up.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const marcarComoConcluido = async (followup: Followup) => {
    try {
      await updateFollowup(followup.id, {
        status: "concluido",
        resultado: followup.resultado ?? "Concluido pelo CRM",
        concluidoEm: new Date().toISOString()
      });
      toast({ description: "Follow-up concluído." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "followups"] });
    } catch (error) {
      console.error(error);
      toast({
        description: error instanceof Error ? error.message : "Falha ao concluir follow-up.",
        variant: "destructive"
      });
    }
  };

  const atualizarStatus = async (followup: Followup, status: string) => {
    try {
      await updateFollowup(followup.id, {
        status,
        resultado: followup.resultado,
        descricao: followup.descricao
      });
      toast({ description: "Follow-up atualizado." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "followups"] });
    } catch (error) {
      console.error(error);
      toast({
        description: error instanceof Error ? error.message : "Falha ao atualizar follow-up.",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout title="Follow-ups">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
            <CardDescription>Agenda de follow-ups registrados pelo time comercial.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-4 md:grid-cols-2">
              <Select value={filters.status} onValueChange={(value) => atualizarFiltro("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.responsavel}
                onValueChange={(value) => atualizarFiltro("responsavel", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os responsáveis</SelectItem>
                  {responsaveis.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Buscar por cliente ou descrição"
                value={filters.busca}
                onChange={(event) => atualizarFiltro("busca", event.target.value)}
                className="lg:col-span-2"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                {isFetching
                  ? "Atualizando agenda..."
                  : `Total carregado: ${formatNumber(followups.length)} follow-ups.`}
              </span>
              <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novo follow-up</CardTitle>
            <CardDescription>Registre um lembrete manual para clientes da base.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <Input
                  value={form.clienteNome}
                  onChange={(event) => setForm((prev) => ({ ...prev, clienteNome: event.target.value }))}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Documento</label>
                <Input
                  value={form.clienteDocumento}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, clienteDocumento: event.target.value }))
                  }
                  placeholder="CPF/CNPJ (opcional)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contato</label>
                <Input
                  value={form.contato}
                  onChange={(event) => setForm((prev) => ({ ...prev, contato: event.target.value }))}
                  placeholder="Telefone, WhatsApp, e-mail..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsável</label>
                <Input
                  value={form.responsavel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, responsavel: event.target.value }))
                  }
                  placeholder="Quem ira realizar o contato"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data agendada</label>
                <Input
                  type="datetime-local"
                  value={form.dataAgendada}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dataAgendada: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Descricao</label>
                <Textarea
                  value={form.descricao}
                  onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                  placeholder="Resumo do proximo passo ou orientacao para o responsável"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={creating}>
                  {creating ? "Registrando..." : "Registrar follow-up"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agenda</CardTitle>
            <CardDescription>Follow-ups pendentes ou em andamento.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : followups.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum follow-up encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agendado para</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followups.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-primary">{item.clienteNome}</span>
                            {item.contato ? (
                              <span className="text-xs text-text-secondary">{item.contato}</span>
                            ) : null}
                            {item.clienteDocumento ? (
                              <span className="text-xs text-text-secondary">{item.clienteDocumento}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.responsavel ? (
                            <Badge variant="outline">{item.responsavel}</Badge>
                          ) : (
                            <span className="text-xs text-text-secondary">Sem responsável</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{STATUS_LABELS[item.status] ?? item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{formatDateTime(item.dataAgendada)}</span>
                            <span className="text-[11px] text-text-secondary">
                              Criado em {formatDate(item.criadoEm)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-text-primary whitespace-pre-wrap">
                            {item.descricao || "--"}
                          </p>
                          {item.resultado ? (
                            <p className="text-xs text-text-secondary mt-1">
                              Resultado: <span className="font-medium">{item.resultado}</span>
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {item.status !== "concluido" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => marcarComoConcluido(item)}
                            >
                              Concluir
                            </Button>
                          ) : null}
                          {item.status !== "cancelado" && item.status !== "concluido" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => atualizarStatus(item, "cancelado")}
                            >
                              Cancelar
                            </Button>
                          ) : null}
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
