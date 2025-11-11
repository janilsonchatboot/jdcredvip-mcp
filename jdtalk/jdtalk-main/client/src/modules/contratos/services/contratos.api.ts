import { backendJson } from "@/lib/jdcredvip";

export type Contrato = {
  id: number;
  contratoId: string;
  clienteNome: string;
  produto: string;
  status: string;
  valorBruto: number;
  valorLiquido: number;
  promotora: string;
  dataContratacao: string | null;
  atualizadoEm: string | null;
};

export type ContratosFilters = {
  search?: string;
  promotora?: string;
  status?: string;
  produto?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
};

const buildQuery = (filters?: ContratosFilters) => {
  if (!filters) return "?limit=100";
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("busca", filters.search.trim());
  if (filters.promotora && filters.promotora !== "todos") params.set("promotora", filters.promotora);
  if (filters.status && filters.status !== "todos") params.set("status", filters.status);
  if (filters.produto && filters.produto !== "todos") params.set("produto", filters.produto);
  if (filters.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters.dataFim) params.set("dataFim", filters.dataFim);
  params.set("limit", String(filters.limit ?? 100));
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const listarContratos = (filters?: ContratosFilters) =>
  backendJson<Contrato[]>(`/api/contratos${buildQuery(filters)}`);
