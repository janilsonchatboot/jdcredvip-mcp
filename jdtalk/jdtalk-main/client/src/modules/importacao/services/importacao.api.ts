import { backendDelete, backendFetch, backendJson } from "@/lib/jdcredvip";

export type CodexAnalysis = {
  fonte?: string;
  insights: string[];
  alertas: string[];
};

export type ImportSummary = {
  filename: string;
  promotora: string;
  totalRegistros: number;
  volumeTotal: number;
  volumeBruto?: number;
  comissaoTotal: number;
  colunasReconhecidas: string[];
  analise?: CodexAnalysis;
};

export type ImportHistoryItem = {
  id: number;
  filename: string;
  promotora: string;
  totalRegistros: number;
  volumeTotal: number;
  comissaoTotal: number;
  insights: string[];
  alertas: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ImportHistoryResponse = {
  total: number;
  itens: ImportHistoryItem[];
};

export const fetchImportHistory = (limit = 10, offset = 0) =>
  backendJson<ImportHistoryResponse>(`/import/historico?limit=${limit}&offset=${offset}`);

export const uploadImportacao = async (file: File, promotora?: string) => {
  const formData = new FormData();
  formData.set("file", file);
  if (promotora) {
    formData.set("promotora", promotora);
  }
  const response = await backendFetch("/import/upload", {
    method: "POST",
    body: formData
  });
  const body = (await response.json()) as { dados?: ImportSummary } | ImportSummary;
  return "dados" in body && body.dados ? body.dados : body;
};

export const removerImportacao = (id: number) => backendDelete(`/import/historico/${id}`);

export const limparImportacoes = () => backendDelete("/import/historico");

export const removerSelecao = (ids: number[]) =>
  backendFetch("/import/historico", {
    method: "DELETE",
    data: { ids }
  });
