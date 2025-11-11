import { backendJson } from "@/lib/jdcredvip";

export type Cliente = {
  id: number;
  nome: string;
  nomeCliente?: string | null;
  documento: string | null;
  telefone: string | null;
  produto: string | null;
  convenio: string | null;
  banco: string | null;
  volumeLiquido: number;
  volumeBruto: number;
  status: string | null;
  statusComercial: string | null;
  situacao: string | null;
  ultimoContato: string | null;
  proximoContato: string | null;
  diasAteFollowup: number | null;
  comissao: number;
  comissaoLiquida: number;
  comissaoPercentual: number | null;
  dataPagamento: string | null;
  origemComissao: string | null;
  situacaoComissao: string | null;
  observacoesEstrategicas: string | null;
  promotora: string | null;
  contrato: string | null;
  contratoAde: string | null;
  resultado: string | null;
  motivoPerda: string | null;
  origem: string | null;
  promotoras?: string[];
  produtos?: string[];
  origens?: string[];
  ultimoStatus?: string | null;
  ultimaAtualizacao?: string | null;
};

export type ClientesAggregates = {
  totalRegistros: number;
  totalClientesUnicos: number;
  volumeLiquidoTotal: number;
  volumeBrutoTotal: number;
  comissaoTotal: number;
};

export type ClientesResponse = {
  total: number;
  totalClientesUnicos: number;
  limit: number;
  offset: number;
  clientes: Cliente[];
  promotorasDisponiveis: string[];
  origensDisponiveis: string[];
  statusDisponiveis: string[];
  aggregates: ClientesAggregates;
};

export type ClientesFilters = {
  search: string;
  promotora: string;
  origem: string;
  status: string;
  produto?: string;
  dataInicio: string;
  dataFim: string;
};

export const DEFAULT_CLIENTES_FILTERS: ClientesFilters = {
  search: "",
  promotora: "todos",
  origem: "todos",
  status: "todos",
  dataInicio: "",
  dataFim: ""
};

const buildQueryString = (filters: ClientesFilters, page: number, pageSize: number) => {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.promotora !== "todos") params.set("promotora", filters.promotora);
  if (filters.origem !== "todos") params.set("origem", filters.origem);
  if (filters.status !== "todos") params.set("status", filters.status);
  if (filters.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters.dataFim) params.set("dataFim", filters.dataFim);
  if (filters.produto && filters.produto !== "todos") params.set("produto", filters.produto);
  params.set("limit", String(pageSize));
  params.set("offset", String((page - 1) * pageSize));

  const query = params.toString();
  return query ? `?${query}` : "";
};

export async function listarClientes(filters: ClientesFilters, page: number, pageSize: number) {
  const query = buildQueryString(filters, page, pageSize);
  return backendJson<ClientesResponse>(`/api/clientes${query}`);
}
