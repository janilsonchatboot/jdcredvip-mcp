import { backendJson } from "@/lib/jdcredvip";

export type DashboardMeta = {
  id: number;
  titulo: string;
  dataReferencia: string;
  publicadoPor: string;
  metrics: {
    totalContratos: number;
    volumeBruto: number;
    volumeLiquido: number;
    comissaoTotal: number;
    volumeImportado?: number;
    comissaoImportada?: number;
    promotorasAtivas?: number;
  };
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type DashboardProduct = {
  id: number;
  metaId: number;
  produto: string;
  quantidade: number;
  volumeBruto: number;
  volumeLiquido: number;
  comissao: number;
  createdAt: string;
};

export type DashboardResponse = {
  meta: DashboardMeta;
  products: DashboardProduct[];
} | null;

export type DashboardFilters = {
  promotora?: string;
  produto?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
};

export type IntegrationLogContext = {
  module?: string | null;
  origin?: string | null;
  actor?: string | null;
  userId?: string | number | null;
  ip?: string | null;
  requestId?: string | null;
  httpStatus?: number | null;
  payload?: unknown;
};

export type IntegrationLogDetails = {
  module?: string;
  origin?: string;
  context?: IntegrationLogContext;
  [key: string]: unknown;
} | null;

export type IntegrationLog = {
  id: number;
  integracao: string;
  acao: string;
  status: string;
  mensagem: string | null;
  detalhes: IntegrationLogDetails;
  created_at: string;
};

export type IntegrationResumo = {
  resumo: {
    propostasCrefaz: number;
    contratosNexxo: number;
    comissoesNexxo: number;
    volumeImportado?: number;
    comissaoImportada?: number;
    promotorasAtivas?: number;
  };
  logsRecentes: IntegrationLog[];
};

export type DashboardMetrics = {
  totalContratos: number;
  volumeBruto: number;
  volumeLiquido: number;
  comissaoTotal: number;
  ticketMedio: number;
  volumeImportado: number;
  comissaoImportada: number;
  promotorasAtivas: number;
};

export type MetricDelta = {
  absolute: number;
  percent: number;
};

export type DashboardComparison = {
  current: {
    dataInicio: string;
    dataFim: string;
    days: number;
  };
  previous: {
    dataInicio: string;
    dataFim: string;
    days: number;
  };
  previousMetrics: DashboardMetrics;
  delta: Record<keyof DashboardMetrics, MetricDelta>;
} | null;

export type DashboardInsights = {
  metrics: DashboardMetrics;
  comparison: DashboardComparison;
  charts: {
    porPromotora: { nome: string; totalContratos: number; volumeLiquido: number }[];
    porProduto: { nome: string; totalContratos: number; volumeLiquido: number }[];
    timeline: { data: string; totalContratos: number; volumeLiquido: number }[];
  };
  importacoes: {
    resumo: {
      totalArquivos: number;
      volumeTotal: number;
      comissaoTotal: number;
      promotoras: string[];
    };
    recentes: {
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
    }[];
  };
} | null;

export type DashboardTrendResponse = {
  range: {
    current?: { dataInicio: string; dataFim: string; days: number };
    previous?: { dataInicio: string; dataFim: string; days: number };
  } | null;
  filters: DashboardFilters;
  series: {
    contratos: {
      current: { data: string; totalContratos: number; volumeLiquido: number; volumeBruto: number }[];
      previous: { data: string; totalContratos: number; volumeLiquido: number; volumeBruto: number }[];
    };
    comissoes: {
      current: { data: string; comissaoTotal: number }[];
      previous: { data: string; comissaoTotal: number }[];
    };
  };
};

export type RankingSnapshot = {
  metrics: DashboardMetrics;
  ranking: {
    promotoras: { nome: string; totalContratos: number; volumeLiquido: number }[];
    produtos: { nome: string; totalContratos: number; volumeLiquido: number }[];
    comissoes: { nome: string; comissaoTotal: number }[];
    status: { nome: string; totalContratos: number }[];
  };
  comissoes: {
    total: number;
    porPromotora: { nome: string; comissaoTotal: number }[];
    porProduto: { nome: string; comissaoTotal: number }[];
  };
};

const buildQuery = (filters?: DashboardFilters) => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.promotora) params.set("promotora", filters.promotora);
  if (filters.produto) params.set("produto", filters.produto);
  if (filters.status) params.set("status", filters.status);
  if (filters.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters.dataFim) params.set("dataFim", filters.dataFim);
  if (filters.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const fetchDashboardMeta = () => backendJson<DashboardResponse>("/api/dashboard");

export const fetchDashboardInsights = (filters?: DashboardFilters) =>
  backendJson<DashboardInsights>(`/api/dashboard/resumo${buildQuery(filters)}`);

export const fetchIntegrationResumo = () => backendJson<IntegrationResumo>("/api/integracoes/status");

export const fetchDashboardTrend = (filters?: DashboardFilters) =>
  backendJson<DashboardTrendResponse>(`/api/dashboard/trend${buildQuery(filters)}`);

export const fetchTopRanking = (limit = 5, filters?: DashboardFilters) =>
  backendJson<RankingSnapshot>(`/api/ranking${buildQuery({ ...filters, limit })}`);

export type IntegrationLogFilters = {
  origem?: string;
  status?: string;
  acao?: string;
  search?: string;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
};

export type IntegrationLogsResponse = {
  total: number;
  items: IntegrationLog[];
};

const buildLogsQuery = (filters?: IntegrationLogFilters) => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.origem && filters.origem !== "todos") params.set("origem", filters.origem);
  if (filters.status) params.set("status", filters.status);
  if (filters.acao) params.set("acao", filters.acao);
  if (filters.search) params.set("search", filters.search);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  if (filters.order) params.set("order", filters.order);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const fetchIntegrationLogs = (filters?: IntegrationLogFilters) =>
  backendJson<IntegrationLogsResponse>(`/api/auditoria/integracoes${buildLogsQuery(filters)}`);
