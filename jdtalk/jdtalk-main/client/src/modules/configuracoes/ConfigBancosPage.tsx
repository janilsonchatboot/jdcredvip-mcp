import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/formatters";
import { listBancos, saveBanco, deleteBanco, Banco } from "./services/configuracoes.api";

type BancoForm = {
  nome: string;
  apelido: string;
  codigo: string;
  taxaMedia: string;
  ativo: boolean;
};

const emptyForm: BancoForm = {
  nome: "",
  apelido: "",
  codigo: "",
  taxaMedia: "",
  ativo: true
};

export default function ConfigBancosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BancoForm>(emptyForm);

  const { data: bancos, isLoading } = useQuery<Banco[]>({
    queryKey: ["jdcredvip", "config", "bancos"],
    queryFn: () => listBancos()
  });

  const orderedBancos = useMemo(
    () => (bancos ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    [bancos]
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: BancoForm) => {
      const body = {
        nome: payload.nome,
        apelido: payload.apelido || null,
        codigo: payload.codigo || null,
        taxaMedia: payload.taxaMedia || null,
        ativo: payload.ativo
      };

      return saveBanco(body, editingId ?? undefined);
    },
    onSuccess: () => {
      toast({ description: "Banco salvo com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "config", "bancos"] });
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Falha ao salvar banco."
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBanco(id),
    onSuccess: (_data, deletedId) => {
      toast({ description: "Banco removido." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "config", "bancos"] });
      if (editingId === deletedId) {
        setEditingId(null);
        setForm(emptyForm);
      }
    },
    onError: () => {
      toast({ variant: "destructive", description: "Não foi possível remover o banco." });
    }
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  const handleEdit = (banco: Banco) => {
    setEditingId(banco.id);
    setForm({
      nome: banco.nome,
      apelido: banco.apelido ?? "",
      codigo: banco.codigo ?? "",
      taxaMedia: banco.taxaMedia !== null ? String(banco.taxaMedia) : "",
      ativo: banco.ativo
    });
  };

  const handleDelete = (id: number) => {
    const banco = bancos?.find((item) => item.id === id);
    const pergunta = banco ? `Remover ${banco.nome}?` : "Remover banco selecionado?";
    if (window.confirm(pergunta)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <AppLayout title="Configurações → Bancos">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de bancos</CardTitle>
            <CardDescription>Defina os bancos utilizados pelos produtos e integrações do MCP.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-card/50">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                  placeholder="Ex.: Banco XYZ"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Apelido</label>
                  <Input
                    value={form.apelido}
                    onChange={(event) => setForm((prev) => ({ ...prev, apelido: event.target.value }))}
                    placeholder="Nome curto (opcional)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Código</label>
                  <Input
                    value={form.codigo}
                    onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))}
                    placeholder="ISPB / Código interno"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Taxa média (%)</label>
                <Input
                  value={form.taxaMedia}
                  inputMode="decimal"
                  placeholder="Ex.: 2.35"
                  onChange={(event) => setForm((prev) => ({ ...prev, taxaMedia: event.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Banco ativo</p>
                  <p className="text-xs text-text-secondary">Bancos inativos não aparecem para novos produtos.</p>
                </div>
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(value) => setForm((prev) => ({ ...prev, ativo: value }))}
                />
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                {editingId ? (
                  <>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Salvando..." : "Atualizar banco"}
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
                    {saveMutation.isPending ? "Salvando..." : "Cadastrar banco"}
                  </Button>
                )}
              </div>
            </form>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bancos cadastrados</CardTitle>
                <CardDescription>Selecione para editar ou remover.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : orderedBancos.length === 0 ? (
                  <p className="text-sm text-text-secondary">Nenhum banco cadastrado até o momento.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Banco</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Taxa média</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderedBancos.map((banco) => (
                        <TableRow key={banco.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-text-primary">{banco.nome}</span>
                              {banco.apelido && (
                                <span className="text-xs text-text-secondary">{banco.apelido}</span>
                              )}
                              <Badge variant={banco.ativo ? "secondary" : "outline"} className="mt-1 w-fit uppercase">
                                {banco.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{banco.codigo || "--"}</TableCell>
                          <TableCell>
                            {banco.taxaMedia !== null ? `${formatNumber(banco.taxaMedia)}%` : "--"}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(banco)}>
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(banco.id)}
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
