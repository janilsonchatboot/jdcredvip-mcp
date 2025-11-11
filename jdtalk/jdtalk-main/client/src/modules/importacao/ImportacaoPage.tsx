import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  fetchImportHistory,
  uploadImportacao,
  removerImportacao as removerImportacaoApi,
  limparImportacoes as limparImportacoesApi,
  removerSelecao,
  ImportSummary,
  ImportHistoryResponse,
  ImportHistoryItem
} from "./services/importacao.api";

const ACCEPTED_FORMATS = [".csv", ".xlsx"];

export default function ImportacaoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [promotora, setPromotora] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  const { data: historico, isLoading: carregandoHistorico } = useQuery({
    queryKey: ["jdcredvip", "importacoes", "historico"],
    queryFn: () => fetchImportHistory(10),
    staleTime: 60_000
  });

  const invalidateImportacaoQueries = () => {
    const keys: (string | number)[][] = [
      ["jdcredvip", "importacoes", "historico"],
      ["jdcredvip", "dashboard", "insights"],
      ["jdcredvip", "dashboard", "meta"],
      ["jdcredvip", "dashboard", "resumo"],
      ["jdcredvip", "dashboard", "ranking"],
      ["jdcredvip", "clientes"],
      ["jdcredvip", "followups"]
    ];
    keys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({ description: "Selecione um arquivo para importar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const resumo = await uploadImportacao(file, promotora || undefined);

      toast({ description: "Relatorio enviado para processamento." });
      setSummary(resumo);
      setFile(null);
      setPromotora("");
      invalidateImportacaoQueries();
    } catch (error) {
      console.error(error);
      toast({
        description: error instanceof Error ? error.message : "Falha ao importar relatorio.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const historicoItens = historico?.itens ?? [];
  useEffect(() => {
    setSelecionados((prev) => prev.filter((id) => historicoItens.some((item) => item.id === id)));
  }, [historicoItens]);

  const todosSelecionados = historicoItens.length > 0 && selecionados.length === historicoItens.length;
  const algunsSelecionados = selecionados.length > 0 && !todosSelecionados;

  const excluirImportacao = useMutation<void, Error, number>({
    mutationFn: async (id: number) => {
      await removerImportacaoApi(id);
    },
    onSuccess: (_data, id) => {
      toast({ description: "Importacao removida com sucesso." });
      setSelecionados((prev) => prev.filter((value) => value !== id));
      invalidateImportacaoQueries();
    },
    onError: (error) => {
      toast({
        description: error?.message || "Falha ao remover importacao.",
        variant: "destructive"
      });
    }
  });

  const limparImportacoes = useMutation<void, Error>({
    mutationFn: async () => {
      await limparImportacoesApi();
    },
    onSuccess: () => {
      toast({ description: "Todas as importacoes foram removidas." });
      setSummary(null);
      setSelecionados([]);
      invalidateImportacaoQueries();
    },
    onError: (error) => {
      toast({
        description: error?.message || "Falha ao limpar importacoes.",
        variant: "destructive"
      });
    }
  });

  const handleExcluirImportacao = (item: ImportHistoryItem) => {
    const confirmacao = window.confirm(`Excluir o arquivo ${item.filename}? Esta acao nao pode ser desfeita.`);
    if (!confirmacao) {
      return;
    }
    excluirImportacao.mutate(item.id);
  };

  const handleLimparImportacoes = () => {
    const confirmacao = window.confirm(
      "Esta acao remove todos os registros importados e o historico associado. Deseja continuar?"
    );
    if (!confirmacao) {
      return;
    }
    limparImportacoes.mutate();
  };

  const removerSelecionados = useMutation<void, Error, number[]>({
    mutationFn: async (ids: number[]) => {
      await removerSelecao(ids);
    },
    onSuccess: () => {
      toast({ description: "Importacoes selecionadas removidas com sucesso." });
      setSelecionados([]);
      invalidateImportacaoQueries();
    },
    onError: (error) => {
      toast({
        description: error?.message || "Falha ao remover importacoes selecionadas.",
        variant: "destructive"
      });
    }
  });

  const toggleSelecionado = (id: number, checked: boolean | string) => {
    setSelecionados((prev) => {
      const isChecked = checked === true;
      if (isChecked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  };

  const toggleSelecionarTodos = (checked: boolean | string) => {
    if (checked === true) {
      setSelecionados(historicoItens.map((item) => item.id));
    } else {
      setSelecionados([]);
    }
  };

  const handleExcluirSelecionados = () => {
    if (!selecionados.length) return;
    const confirmacao = window.confirm(
      `Remover ${selecionados.length} importacoes selecionadas e todos os dados associados?`
    );
    if (!confirmacao) {
      return;
    }
    removerSelecionados.mutate(selecionados);
  };

  const estatisticasImportacao = useMemo(() => {
    if (!historicoItens.length) {
      return {
        totalArquivos: 0,
        volumeTotal: 0,
        comissaoTotal: 0
      };
    }

    return historicoItens.reduce(
      (acc, item) => {
        acc.totalArquivos += 1;
        acc.volumeTotal += item.volumeTotal;
        acc.comissaoTotal += item.comissaoTotal;
        return acc;
      },
      { totalArquivos: 0, volumeTotal: 0, comissaoTotal: 0 }
    );
  }, [historicoItens]);

  return (
    <AppLayout title="Importacao de Relatorios">
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Importacao de relatorios</CardTitle>
            <CardDescription>
              Envie arquivos exportados pelas promotoras (Nexxo, WorkBank, Yuppie) nos formatos CSV ou XLSX.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="file">Selecione o arquivo</Label>
                <Input
                  id="file"
                  type="file"
                  accept={ACCEPTED_FORMATS.join(",")}
                  onChange={async (event) => {
                    const selected = event.target.files?.[0] ?? null;
                    setFile(selected || null);
                    setSummary(null);
                    if (!selected) {
                      return;
                    }

                    const slug = selected.name.toLowerCase();
                    if (slug.includes("nexxo")) setPromotora("Nexxo");
                    else if (slug.includes("work")) setPromotora("WorkBank");
                    else if (slug.includes("yuppie")) setPromotora("Yuppie");
                    else if (slug.includes("crefaz")) setPromotora("Crefaz");

                  }}
                  required
                />
                <p className="text-xs text-text-secondary">
                  Formatos aceitos: {ACCEPTED_FORMATS.join(", ").toUpperCase()}
                </p>
                {file && <Badge variant="outline">Arquivo selecionado: {file.name}</Badge>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotora">Promotora</Label>
                <Input
                  id="promotora"
                  placeholder="Detectado automaticamente pelo nome do arquivo"
                  value={promotora}
                  onChange={(event) => setPromotora(event.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading || !file}>
                  {loading ? "Processando..." : "Processar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo do processamento</CardTitle>
              <CardDescription>Dados extraidos do relatorio enviado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <InfoRow label="Arquivo" value={summary.filename} />
                <InfoRow label="Promotora">
                  <Badge variant="outline">{summary.promotora}</Badge>
                </InfoRow>
                <InfoRow label="Registros" value={formatNumber(summary.totalRegistros)} />
                <InfoRow label="Volume total" value={formatCurrency(summary.volumeTotal)} />
                <InfoRow label="Comissao total" value={formatCurrency(summary.comissaoTotal)} />
              </div>

              {summary.colunasReconhecidas?.length ? (
                <div className="space-y-2">
                  <span className="font-medium">Colunas reconhecidas:</span>
                  <div className="flex flex-wrap gap-2">
                    {summary.colunasReconhecidas.map((coluna) => (
                      <Badge key={coluna} variant="secondary">
                        {coluna}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {summary.analise && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Analise Codex</span>
                    {summary.analise.fonte && (
                      <Badge variant="outline" className="uppercase">
                        {summary.analise.fonte}
                      </Badge>
                    )}
                  </div>
                  {summary.analise.insights?.length ? (
                    <div>
                      <p className="text-xs uppercase text-text-secondary mb-1">Insights</p>
                      <ul className="list-disc list-inside space-y-1">
                        {summary.analise.insights.map((item, index) => (
                          <li key={`insight-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {summary.analise.alertas?.length ? (
                    <div>
                      <p className="text-xs uppercase text-red-600 mb-1">Alertas</p>
                      <ul className="list-disc list-inside space-y-1 text-red-600">
                        {summary.analise.alertas.map((item, index) => (
                          <li key={`alerta-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Historico recente</CardTitle>
              <CardDescription>
                Ultimos arquivos importados e analisados pelo Codex.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right text-xs text-text-secondary">
                <p>Total de arquivos: {formatNumber(estatisticasImportacao.totalArquivos)}</p>
                <p>Volume somado: {formatCurrency(estatisticasImportacao.volumeTotal)}</p>
                <p>Comissao somada: {formatCurrency(estatisticasImportacao.comissaoTotal)}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {selecionados.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExcluirSelecionados}
                    disabled={removerSelecionados.isPending}
                  >
                    {removerSelecionados.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Removendo...
                      </span>
                    ) : (
                      `Excluir selecionados (${selecionados.length})`
                    )}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLimparImportacoes}
                  disabled={limparImportacoes.isPending}
                >
                  {limparImportacoes.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Limpando...
                    </span>
                  ) : (
                    "Limpar importacoes"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {carregandoHistorico ? (
              <Skeleton className="h-56 w-full" />
            ) : historicoItens.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhuma importacao registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          aria-label="Selecionar todas as importacoes"
                          checked={todosSelecionados ? true : algunsSelecionados ? "indeterminate" : false}
                          onCheckedChange={toggleSelecionarTodos}
                        />
                      </TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Promotora</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Comissao</TableHead>
                      <TableHead>Insights</TableHead>
                      <TableHead>Alertas</TableHead>
                      <TableHead>Importado em</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoItens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Selecionar ${item.filename}`}
                            checked={selecionados.includes(item.id)}
                            onCheckedChange={(checked) => toggleSelecionado(item.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.filename}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.promotora}</Badge>
                        </TableCell>
                        <TableCell>{formatNumber(item.totalRegistros)}</TableCell>
                        <TableCell>{formatCurrency(item.volumeTotal)}</TableCell>
                        <TableCell>{formatCurrency(item.comissaoTotal)}</TableCell>
                        <TableCell>
                          {item.insights?.length ? (
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              {item.insights.map((texto, index) => (
                                <li key={`hist-insight-${item.id}-${index}`}>{texto}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-text-secondary">Sem insights</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.alertas?.length ? (
                            <ul className="list-disc list-inside space-y-1 text-xs text-red-600">
                              {item.alertas.map((texto, index) => (
                                <li key={`hist-alerta-${item.id}-${index}`}>{texto}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-text-secondary">Sem alertas</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Excluir importacao ${item.filename}`}
                            disabled={excluirImportacao.isPending && excluirImportacao.variables === item.id}
                            onClick={() => handleExcluirImportacao(item)}
                          >
                            {excluirImportacao.isPending && excluirImportacao.variables === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
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

type InfoRowProps = {
  label: string;
  value?: string;
  children?: React.ReactNode;
};

const InfoRow = ({ label, value, children }: InfoRowProps) => (
  <div className="flex items-center gap-2">
    <span className="font-medium">{label}:</span>
    {children ?? <span>{value}</span>}
  </div>
);
