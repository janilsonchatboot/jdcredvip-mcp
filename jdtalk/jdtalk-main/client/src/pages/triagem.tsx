import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { backendJson, backendPostJson } from "@/lib/jdcredvip";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

type PerfilKey = "isINSS" | "isBA" | "isCLT";
type PerfilState = Record<PerfilKey, boolean>;

type TriagemPayload = {
  nome: string;
  produtoInformado: string;
  volumeLiquido: number;
  perfil: PerfilState;
  observacoes?: string;
};

type TriagemResponse = {
  nome: string;
  produtoIdeal: string;
  motivo: string;
  limiteEstimado: number;
  comissaoPercent: number;
  comissaoEstimada: number;
  upsell: string;
  status: string;
};

type DashboardProductsResponse = {
  products?: Array<{ produto: string }>;
} | null;

const EMPTY_FORM: TriagemPayload = {
  nome: "",
  produtoInformado: "",
  volumeLiquido: 0,
  perfil: { isINSS: false, isBA: false, isCLT: false },
  observacoes: "",
};

export default function TriagemPage() {
  const [formState, setFormState] = useState<TriagemPayload>(EMPTY_FORM);
  const [resultado, setResultado] = useState<TriagemResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: availableProducts = [], isFetching: loadingProdutos } = useQuery<string[]>({
    queryKey: ["jdcredvip", "triagem", "produtos"],
    queryFn: async () => {
      const dashboard = await backendJson<DashboardProductsResponse>("/api/dashboard");
      const products = new Set<string>();
      dashboard?.products?.forEach((item) => {
        const nome = item.produto?.trim();
        if (nome) products.add(nome);
      });
      return Array.from(products).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });

  const volumeDisplay = useMemo(() => {
    if (!formState.volumeLiquido) return "";
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(formState.volumeLiquido);
  }, [formState.volumeLiquido]);

  const handleTogglePerfil = (key: PerfilKey) => {
    setFormState((prev) => ({
      ...prev,
      perfil: {
        ...prev.perfil,
        [key]: !prev.perfil[key],
      },
    }));
  };

  const handleChange = (key: keyof TriagemPayload, value: string) => {
    if (key === "volumeLiquido") {
      const normalized = value.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalized);
      setFormState((prev) => ({ ...prev, volumeLiquido: Number.isFinite(parsed) ? parsed : 0 }));
      return;
    }

    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: TriagemPayload = {
        ...formState,
        volumeLiquido: Number.isFinite(formState.volumeLiquido) ? formState.volumeLiquido : 0,
      };

      const response = await backendPostJson<TriagemResponse>("/triagem", payload);
      setResultado(response);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Falha ao consultar o motor de triagem.");
      setResultado(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Motor de Triagem">
      <div className="p-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nova triagem</CardTitle>
            <CardDescription>Use o motor MCP para sugerir produto e limite ideais para o cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do cliente</Label>
                  <Input
                    id="nome"
                    placeholder="Ex.: Maria Souza"
                    value={formState.nome}
                    onChange={(event) => handleChange("nome", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="produto">Produto informado</Label>
                  <Input
                    id="produto"
                    placeholder="Consignado, FGTS, cartão..."
                    value={formState.produtoInformado}
                    onChange={(event) => handleChange("produtoInformado", event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {loadingProdutos && (
                      <Badge variant="outline" className="text-xs">
                        Carregando sugestões...
                      </Badge>
                    )}
                    {!loadingProdutos && availableProducts.length === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Sem sugestões disponíveis ainda
                      </Badge>
                    )}
                    {availableProducts.map((produto) => (
                      <Button
                        key={produto}
                        type="button"
                        variant={formState.produtoInformado === produto ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleChange("produtoInformado", produto)}
                      >
                        {produto}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume">Volume líquido desejado</Label>
                  <Input
                    id="volume"
                    inputMode="decimal"
                    placeholder="R$ 5.000,00"
                    value={volumeDisplay}
                    onChange={(event) => handleChange("volumeLiquido", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfis elegíveis</Label>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                    <PerfilSwitch
                      label="INSS"
                      checked={formState.perfil.isINSS}
                      onCheckedChange={() => handleTogglePerfil("isINSS")}
                    />
                    <PerfilSwitch
                      label="Bolsa Familia"
                      checked={formState.perfil.isBA}
                      onCheckedChange={() => handleTogglePerfil("isBA")}
                    />
                    <PerfilSwitch
                      label="CLT"
                      checked={formState.perfil.isCLT}
                      onCheckedChange={() => handleTogglePerfil("isCLT")}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Histórico relevante, documentos apresentados..."
                  rows={3}
                  value={formState.observacoes ?? ""}
                  onChange={(event) => handleChange("observacoes", event.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 flex-wrap">
                <Button
                  type="reset"
                  variant="ghost"
                  onClick={() => {
                    setFormState(EMPTY_FORM);
                    setResultado(null);
                    setError(null);
                  }}
                >
                  Limpar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Consultando..." : "Rodar triagem"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>Resumo gerado pelo motor com recomendacaoão e próximos passos.</CardDescription>
          </CardHeader>
          <CardContent>
            {resultado ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-text-secondary">Produto sugerido</p>
                    <p className="text-lg font-semibold text-text-primary">{resultado.produtoIdeal}</p>
                  </div>
                  <Badge variant="outline" className="uppercase">
                    {resultado.status}
                  </Badge>
                </div>

                <Separator />

                <div className="grid gap-3">
                  <ResumoItem label="Motivo" value={resultado.motivo} />
                  <ResumoItem label="Limite estimado" value={formatCurrency(resultado.limiteEstimado)} />
                  <ResumoItem
                    label="Comissao estimada"
                    value={`${formatCurrency(resultado.comissaoEstimada)} (${(resultado.comissaoPercent * 100).toFixed(1)}%)`}
                  />
                  <ResumoItem label="Sugestao de upsell" value={resultado.upsell || "—"} />
                </div>
              </div>
            ) : (
              <div className="text-sm text-text-secondary">
                Preencha os dados do cliente ao lado e processe a triagem para visualizar a recomendacaoão.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

type PerfilSwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
};

const PerfilSwitch = ({ label, checked, onCheckedChange }: PerfilSwitchProps) => (
  <button
    type="button"
    onClick={onCheckedChange}
    className={`flex flex-col items-center justify-center rounded-md border px-2 py-3 text-center transition ${
      checked ? "border-primary bg-primary/10 text-primary" : "border-neutral-medium text-text-secondary hover:bg-neutral-light"
    }`}
  >
    <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      onClick={(event) => event.stopPropagation()}
      className="mt-2"
    />
  </button>
);

type ResumoItemProps = {
  label: string;
  value: string;
};

const ResumoItem = ({ label, value }: ResumoItemProps) => (
  <div className="space-y-1">
    <p className="text-xs uppercase text-text-secondary">{label}</p>
    <p className="text-sm font-medium text-text-primary">{value}</p>
  </div>
);
