import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPromotoras, savePromotora, deletePromotora, Promotora } from "./services/configuracoes.api";

type PromotoraForm = {
  nome: string;
  documento: string;
  responsavel: string;
  contato: string;
  status: string;
};

const emptyForm: PromotoraForm = {
  nome: "",
  documento: "",
  responsavel: "",
  contato: "",
  status: "ativo"
};

const statusOptions = [
  { value: "ativo", label: "Ativo" },
  { value: "pausado", label: "Pausado" },
  { value: "suspenso", label: "Suspenso" }
];

export default function ConfigPromotorasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PromotoraForm>(emptyForm);

  const { data: promotoras, isLoading } = useQuery<Promotora[]>({
    queryKey: ["jdcredvip", "config", "promotoras"],
    queryFn: () => listPromotoras()
  });

  const orderedPromotoras = useMemo(
    () => (promotoras ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    [promotoras]
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: PromotoraForm) => {
      const body = {
        nome: payload.nome,
        documento: payload.documento || null,
        responsavel: payload.responsavel || null,
        contato: payload.contato || null,
        status: payload.status
      };

      return savePromotora(body, editingId ?? undefined);
    },
    onSuccess: () => {
      toast({ description: "Promotora salva com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "config", "promotoras"] });
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Falha ao salvar promotora."
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePromotora(id),
    onSuccess: (_data, deletedId) => {
      toast({ description: "Promotora removida." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "config", "promotoras"] });
      if (editingId === deletedId) {
        setEditingId(null);
        setForm(emptyForm);
      }
    },
    onError: () => {
      toast({ variant: "destructive", description: "Não foi possível remover a promotora." });
    }
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  const handleEdit = (promotora: Promotora) => {
    setEditingId(promotora.id);
    setForm({
      nome: promotora.nome,
      documento: promotora.documento ?? "",
      responsavel: promotora.responsavel ?? "",
      contato: promotora.contato ?? "",
      status: promotora.status
    });
  };

  const handleDelete = (id: number) => {
    const promotora = promotoras?.find((item) => item.id === id);
    const pergunta = promotora ? `Remover ${promotora.nome}?` : "Remover promotora selecionada?";
    if (window.confirm(pergunta)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <AppLayout title="Configurações → Promotoras">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de promotoras parceiras</CardTitle>
            <CardDescription>Centralize documentos, contatos e status operacional de cada promotora.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-card/50">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                  placeholder="Ex.: Promotora JD"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Documento (CNPJ/CPF)</label>
                <Input
                  value={form.documento}
                  onChange={(event) => setForm((prev) => ({ ...prev, documento: event.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsável</label>
                  <Input
                    value={form.responsavel}
                    onChange={(event) => setForm((prev) => ({ ...prev, responsavel: event.target.value }))}
                    placeholder="Coordenador, gerente..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contato</label>
                  <Input
                    value={form.contato}
                    onChange={(event) => setForm((prev) => ({ ...prev, contato: event.target.value }))}
                    placeholder="E-mail ou telefone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status operacional</label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                {editingId ? (
                  <>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Salvando..." : "Atualizar promotora"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null);
                        setForm(emptyForm);
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Salvando..." : "Cadastrar promotora"}
                  </Button>
                )}
              </div>
            </form>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Promotoras cadastradas</CardTitle>
                <CardDescription>Selecione para editar ou remover.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : orderedPromotoras.length === 0 ? (
                  <p className="text-sm text-text-secondary">Nenhuma promotora cadastrada até o momento.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Promotora</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderedPromotoras.map((promotora) => (
                        <TableRow key={promotora.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-text-primary">{promotora.nome}</span>
                              {promotora.documento && (
                                <span className="text-xs text-text-secondary">{promotora.documento}</span>
                              )}
                              {promotora.responsavel && (
                                <span className="text-xs text-text-secondary">Resp.: {promotora.responsavel}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {promotora.contato ? (
                              <span className="text-sm">{promotora.contato}</span>
                            ) : (
                              <span className="text-xs text-text-secondary">Sem contato</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={promotora.status === "ativo" ? "secondary" : "outline"} className="uppercase">
                              {promotora.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(promotora)}>
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(promotora.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
