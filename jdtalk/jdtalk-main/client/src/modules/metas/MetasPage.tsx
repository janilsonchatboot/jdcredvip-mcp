import { ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import {
  listMetas,
  publishMeta,
  updateMeta,
  getMetaById,
  MetaItem,
  MetaProduct,
  PublishMetaPayload
} from "./services/metas.api";

const createEmptyProduct = (): MetaProductForm => ({
  produto: "",
  quantidade: "",
  volumeBruto: "",
  volumeLiquido: "",
  comissao: ""
});

type MetaProductForm = {
  produto: string;
  quantidade: string;
  volumeBruto: string;
  volumeLiquido: string;
  comissao: string;
};

type MetaFormState = {
  titulo: string;
  dataReferencia: string;
  publicadoPor: string;
  totalContratos: string;
  volumeBruto: string;
  volumeLiquido: string;
  comissaoTotal: string;
  metadata: string;
  products: MetaProductForm[];
};

const initialMetaFormState: MetaFormState = {
  titulo: "",
  dataReferencia: "",
  publicadoPor: "",
  totalContratos: "",
  volumeBruto: "",
  volumeLiquido: "",
  comissaoTotal: "",
  metadata: "",
  products: [createEmptyProduct()]
};

export default function MetasPage() {
  const queryClient = useQueryClient();
  const { data: metas, isLoading } = useQuery<MetaItem[]>({
    queryKey: ["jdcredvip", "metas", { limit: 50 }],
    queryFn: () => listMetas(50, 0)
  });

  const publishMetaMutation = useMutation({
    mutationFn: (payload: PublishMetaPayload) => publishMeta(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "metas"] });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "dashboard"] });
      toast({ description: "Meta publicada com sucesso!" });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Falha ao publicar meta."
      });
    }
  });

  const updateMetaMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PublishMetaPayload }) => updateMeta(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "metas"] });
      queryClient.invalidateQueries({ queryKey: ["jdcredvip", "dashboard"] });
      toast({ description: "Meta atualizada com sucesso!" });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Falha ao atualizar meta."
      });
    }
  });

  const metasOrdenadas = useMemo(() => {
    if (!metas) return [];
    return [...metas].sort((a, b) => new Date(b.dataReferencia).getTime() - new Date(a.dataReferencia).getTime());
  }, [metas]);

  return (
    <AppLayout title="Metas e indicadores">
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Metas operacionais</h1>
            <p className="text-text-secondary">
              Cadastre e acompanhe metas publicadas pelo time JD CRED VIP. Estes dados abastecem o dashboard principal.
            </p>
          </div>
          <MetaDialog
            mode="create"
            title="Nova meta JD CRED VIP"
            submitLabel="Publicar meta"
            trigger={<Button>Publicar nova meta</Button>}
            onSubmit={(payload) => publishMetaMutation.mutate(payload)}
            submitting={publishMetaMutation.isPending}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de metas</CardTitle>
            <CardDescription>Últimas metas publicadas com métricas consolidadas.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : metasOrdenadas.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Publicado por</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead className="text-right">Volume líquido</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metasOrdenadas.map((meta) => (
                    <TableRow key={meta.id}>
                      <TableCell>{formatDate(meta.dataReferencia)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{meta.titulo}</span>
                          <span className="text-xs text-text-secondary">ID {meta.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{meta.publicadoPor}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(meta.metrics.totalContratos)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(meta.metrics.volumeLiquido)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(meta.metrics.comissaoTotal)}</TableCell>
                      <TableCell className="text-right">
                        <MetaDialog
                          mode="edit"
                          metaId={meta.id}
                          title={`Editar meta - ${meta.titulo}`}
                          submitLabel="Salvar alterações"
                          trigger={
                            <Button variant="outline" size="sm">
                              Editar
                            </Button>
                          }
                          onSubmit={(payload) => updateMetaMutation.mutate({ id: meta.id, payload })}
                          submitting={updateMetaMutation.isPending && updateMetaMutation.variables?.id === meta.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-text-secondary">Nenhuma meta publicada até o momento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

type MetaDialogProps = {
  mode: "create" | "edit";
  trigger: ReactNode;
  title: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (payload: PublishMetaPayload) => void;
  metaId?: number;
};

function MetaDialog({ mode, trigger, title, submitLabel, submitting, onSubmit, metaId }: MetaDialogProps) {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<MetaFormState>(initialMetaFormState);
  const [error, setError] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["jdcredvip", "metas", "detalhe", metaId],
    queryFn: () => getMetaById(metaId!),
    enabled: mode === "edit" && open && Boolean(metaId)
  });

  useEffect(() => {
    if (mode === "create" && open) {
      setFormState(initialMetaFormState);
      setError(null);
    }
  }, [mode, open]);

  useEffect(() => {
    if (mode === "edit" && data?.meta) {
      setFormState(buildFormStateFromDetail(data.meta, data.products));
      setError(null);
    }
  }, [mode, data]);

  const handleProductChange = (index: number, field: keyof MetaProductForm, value: string) => {
    setFormState((prev) => {
      const clone = [...prev.products];
      clone[index] = {
        ...clone[index],
        [field]: value
      };
      return {
        ...prev,
        products: clone
      };
    });
  };

  const handleAddProduct = () => {
    setFormState((prev) => ({
      ...prev,
      products: [...prev.products, createEmptyProduct()]
    }));
  };

  const handleRemoveProduct = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    try {
      const payload: PublishMetaPayload = {
        titulo: formState.titulo.trim(),
        dataReferencia: formState.dataReferencia,
        publicadoPor: formState.publicadoPor,
        metrics: {
          totalContratos: parseInt(formState.totalContratos || "0", 10) || 0,
          volumeBruto: parseNumber(formState.volumeBruto),
          volumeLiquido: parseNumber(formState.volumeLiquido),
          comissaoTotal: parseNumber(formState.comissaoTotal)
        },
        products: formState.products
          .filter((produto) => produto.produto.trim().length > 0)
          .map((produto) => ({
            produto: produto.produto.trim(),
            quantidade: parseInt(produto.quantidade || "0", 10) || 0,
            volumeBruto: parseNumber(produto.volumeBruto),
            volumeLiquido: parseNumber(produto.volumeLiquido),
            comissao: parseNumber(produto.comissao)
          })),
        metadata: formState.metadata ? safeParseMetadata(formState.metadata) : null
      };

      onSubmit(payload);
      if (!submitting) {
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível preparar a meta.");
    }
  };

  const isEditLoading = mode === "edit" && isFetching && !data;

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        setOpen(state);
        if (!state) {
          setError(null);
          setFormState(initialMetaFormState);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preencha os indicadores consolidados e produtos associados.</DialogDescription>
        </DialogHeader>

        {isEditLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando meta...</div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={formState.titulo}
                  onChange={(event) => setFormState((prev) => ({ ...prev, titulo: event.target.value }))}
                  placeholder="Meta Semana 44"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referencia">Data de referência</Label>
                <Input
                  id="referencia"
                  type="date"
                  value={formState.dataReferencia}
                  onChange={(event) => setFormState((prev) => ({ ...prev, dataReferencia: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publicadoPor">Publicado por</Label>
                <Input
                  id="publicadoPor"
                  value={formState.publicadoPor}
                  onChange={(event) => setFormState((prev) => ({ ...prev, publicadoPor: event.target.value }))}
                  placeholder="Responsável"
                />
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-3">
              <NumberField
                label="Total de contratos"
                value={formState.totalContratos}
                onChange={(value) => setFormState((prev) => ({ ...prev, totalContratos: value }))}
              />
              <NumberField
                label="Volume bruto (R$)"
                value={formState.volumeBruto}
                onChange={(value) => setFormState((prev) => ({ ...prev, volumeBruto: value }))}
              />
              <NumberField
                label="Volume líquido (R$)"
                value={formState.volumeLiquido}
                onChange={(value) => setFormState((prev) => ({ ...prev, volumeLiquido: value }))}
              />
              <NumberField
                label="Comissão total (R$)"
                value={formState.comissaoTotal}
                onChange={(value) => setFormState((prev) => ({ ...prev, comissaoTotal: value }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Produtos (opcional)</Label>
              <div className="space-y-3">
                {formState.products.map((product, index) => (
                  <div key={index} className="rounded-md border border-neutral-medium p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm text-text-secondary uppercase">Produto #{index + 1}</span>
                      {formState.products.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveProduct(index)}>
                          Remover
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={product.produto}
                          onChange={(event) => handleProductChange(index, "produto", event.target.value)}
                          placeholder="INSS, FGTS, etc."
                        />
                      </div>
                      <NumberField
                        label="Quantidade"
                        value={product.quantidade}
                        onChange={(value) => handleProductChange(index, "quantidade", value)}
                      />
                      <NumberField
                        label="Volume bruto (R$)"
                        value={product.volumeBruto}
                        onChange={(value) => handleProductChange(index, "volumeBruto", value)}
                      />
                      <NumberField
                        label="Volume líquido (R$)"
                        value={product.volumeLiquido}
                        onChange={(value) => handleProductChange(index, "volumeLiquido", value)}
                      />
                      <NumberField
                        label="Comissão (R$)"
                        value={product.comissao}
                        onChange={(value) => handleProductChange(index, "comissao", value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={handleAddProduct} className="w-full md:w-auto">
                Adicionar produto
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (JSON opcional)</Label>
              <Textarea
                id="metadata"
                value={formState.metadata}
                onChange={(event) => setFormState((prev) => ({ ...prev, metadata: event.target.value }))}
                placeholder='{"observacao": "edição especial"}'
                rows={3}
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || isEditLoading}>
            {submitting ? "Salvando..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const parseNumber = (value: string) => {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeParseMetadata = (value: string) => {
  try {
    return JSON.parse(value);
  } catch (_error) {
    throw new Error("Metadata precisa ser um JSON válido.");
  }
};

const buildFormStateFromDetail = (meta: MetaItem, products: MetaProduct[]): MetaFormState => ({
  titulo: meta.titulo,
  dataReferencia: meta.dataReferencia?.slice(0, 10) ?? "",
  publicadoPor: meta.publicadoPor,
  totalContratos: String(meta.metrics.totalContratos ?? ""),
  volumeBruto: meta.metrics.volumeBruto?.toString() ?? "",
  volumeLiquido: meta.metrics.volumeLiquido?.toString() ?? "",
  comissaoTotal: meta.metrics.comissaoTotal?.toString() ?? "",
  metadata: meta.metadata ? JSON.stringify(meta.metadata, null, 2) : "",
  products:
    products.length > 0
      ? products.map((produto) => ({
          produto: produto.produto,
          quantidade: produto.quantidade?.toString() ?? "",
          volumeBruto: produto.volumeBruto?.toString() ?? "",
          volumeLiquido: produto.volumeLiquido?.toString() ?? "",
          comissao: produto.comissao?.toString() ?? ""
        }))
      : [createEmptyProduct()]
});

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const NumberField = ({ label, value, onChange }: NumberFieldProps) =>
  (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
