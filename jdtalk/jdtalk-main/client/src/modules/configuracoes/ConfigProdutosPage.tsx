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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/formatters";
import {
  listBancos,
  listPromotoras,
  listProdutos,
  saveProduto,
  deleteProduto,
  Banco,
  Promotora,
  ProdutoConfiguracao
} from "./services/configuracoes.api";

type ProdutoForm = {
  nome: string;
  tipo: string;
  bancoId: string;
  promotoraId: string;
  taxaMedia: string;
  comissaoPercent: string;
  ativo: boolean;
};

const emptyForm: ProdutoForm = {
  nome: "",
  tipo: "",
  bancoId: "",
  promotoraId: "",
  taxaMedia: "",
  comissaoPercent: "",
  ativo: true
};

const produtoTipos = ["generico", "consignado", "fgts", "energia", "cartao"];

export default function ConfigProdutosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProdutoForm>(emptyForm);

  const { data: produtos, isLoading } = useQuery<ProdutoConfiguracao[]>({
    queryKey: ["jdcredvip", "config", "produtos"],
    queryFn: () => listProdutos()
  });

  const { data: bancos } = useQuery<Banco[]>({
    queryKey: ["jdcredvip", "config", "bancos"],
    queryFn: () => listBancos()
  });

  const { data: promotoras } = useQuery<Promotora[]>({
    queryKey: ["jdcredvip", "config", "promotoras"],
    queryFn: () => listPromotoras()
  });

  const orderedProdutos = useMemo(
    () => (produtos ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    [produtos]
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: ProdutoForm) => {
      const body = {
        nome: payload.nome,
        tipo: payload.tipo || "generico",
        bancoId: payload.bancoId ? Number(payload.bancoId) : null,
        promotoraId: payload.promotoraId ? Number(payload.promotoraId) : null,
        taxaMedia: payload.taxaMedia || null,
        comissaoPercent: payload.comissaoPercent || null,
        ativo: payload.ativo
      };

      return saveProduto(body, editingId ?? undefined);
    },
    onSuccess: () => {
      toast({ description: "Produto salvo com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "config", "produtos"] });
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Falha ao salvar produto."
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduto(id),
    onSuccess: (_data, deletedId) => {
      toast({ description: "Produto removido." });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "config", "produtos"] });
      if (editingId === deletedId) {
        setEditingId(null);
        setForm(emptyForm);
      }
    },
    onError: () => {
      toast({ variant: "destructive", description: "Não foi possível remover o produto." });
    }
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  const handleEdit = (produto: ProdutoConfiguracao) => {
    setEditingId(produto.id);
    setForm({
      nome: produto.nome,
      tipo: produto.tipo,
      bancoId: produto.bancoId ? String(produto.bancoId) : "",
      promotoraId: produto.promotoraId ? String(produto.promotoraId) : "",
      taxaMedia: produto.taxaMedia !== null ? String(produto.taxaMedia) : "",
      comissaoPercent: produto.comissaoPercent !== null ? String(produto.comissaoPercent) : "",
      ativo: produto.ativo
    });
  };

  const handleDelete = (id: number) => {
    const produto = produtos?.find((item) => item.id === id);
    const pergunta = produto ? `Remover ${produto.nome}?` : "Remover produto selecionado?";
    if (window.confirm(pergunta)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <AppLayout title="Configurações → Produtos">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de produtos</CardTitle>
            <CardDescription>Associe cada produto a um banco e promotora para liberar na triagem e integrações.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-card/50">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do produto</label>
                <Input
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                  placeholder="Ex.: INSS Consignado"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo / categoria</label>
                <Select
                  value={form.tipo || "generico"}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtoTipos.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco</label>
                  <Select
                    value={form.bancoId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, bancoId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem vínculo</SelectItem>
                      {(bancos ?? []).map((banco) => (
                        <SelectItem key={banco.id} value={String(banco.id)}>
                          {banco.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Promotora</label>
                  <Select
                    value={form.promotoraId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, promotoraId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a promotora" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem vínculo</SelectItem>
                      {(promotoras ?? []).map((promotora) => (
                        <SelectItem key={promotora.id} value={String(promotora.id)}>
                          {promotora.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Taxa média (%)</label>
                  <Input
                    value={form.taxaMedia}
                    inputMode="decimal"
                    placeholder="1.95"
                    onChange={(event) => setForm((prev) => ({ ...prev, taxaMedia: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Comissão (%)</label>
                  <Input
                    value={form.comissaoPercent}
                    inputMode="decimal"
                    placeholder="15.2"
                    onChange={(event) => setForm((prev) => ({ ...prev, comissaoPercent: event.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Produto ativo</p>
                  <p className="text-xs text-text-secondary">Produtos inativos ficam ocultos para os promotores.</p>
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
                      {saveMutation.isPending ? "Salvando..." : "Atualizar produto"}
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
                    {saveMutation.isPending ? "Salvando..." : "Cadastrar produto"}
                  </Button>
                )}
              </div>
            </form>

            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Produtos cadastrados</CardTitle>
                <CardDescription>Central de referência para a triagem e integrações.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : orderedProdutos.length === 0 ? (
                  <p className="text-sm text-text-secondary">Nenhum produto cadastrado até o momento.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Banco / Promotora</TableHead>
                        <TableHead>Taxa</TableHead>
                        <TableHead>Comissão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderedProdutos.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-text-primary">{produto.nome}</span>
                              <span className="text-xs text-text-secondary uppercase">{produto.tipo}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span>{produto.bancoNome || "—"}</span>
                              <span className="text-xs text-text-secondary">{produto.promotoraNome || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {produto.taxaMedia !== null ? `${formatNumber(produto.taxaMedia)}%` : "--"}
                          </TableCell>
                          <TableCell>
                            {produto.comissaoPercent !== null ? `${formatNumber(produto.comissaoPercent)}%` : "--"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={produto.ativo ? "secondary" : "outline"} className="uppercase">
                              {produto.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(produto)}>
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(produto.id)}
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
