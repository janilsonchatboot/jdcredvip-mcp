import { backendJson } from "@/lib/jdcredvip";

export type RankingResumo = {
  metrics: {
    totalContratos: number;
    volumeBruto: number;
    volumeLiquido: number;
    comissaoTotal: number;
  };
  ranking: {
    promotoras: {
      nome: string;
      totalContratos: number;
      volumeLiquido: number;
      volumeBruto: number;
      ticketMedio: number;
    }[];
    produtos: {
      nome: string;
      totalContratos: number;
      volumeLiquido: number;
      volumeBruto: number;
      ticketMedio: number;
      comissaoTotal: number;
    }[];
    comissoes: { promotora: string; comissaoTotal: number }[];
    status: { status: string; totalContratos: number; volumeLiquido: number }[];
  };
  comissoes: {
    porPromotora: { promotora: string; comissaoTotal: number }[];
    porProduto: { produto: string; comissaoTotal: number }[];
  };
  charts: {
    porPromotora: { nome: string; totalContratos: number; volumeLiquido: number }[];
    porProduto: { nome: string; totalContratos: number; volumeLiquido: number }[];
    porStatus: { status: string; totalContratos: number; volumeLiquido: number }[];
  };
  importacoes: {
    resumo: {
      totalArquivos: number;
      volumeTotal: number;
      comissaoTotal: number;
      promotoras: string[];
    };
  };
};

export type RankingFilters = {
  promotora?: string;
  produto?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
};

const buildQuery = (filters?: RankingFilters) => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.promotora) params.set("promotora", filters.promotora);
  if (filters.produto) params.set("produto", filters.produto);
  if (filters.status) params.set("status", filters.status);
  if (filters.dataInicio) params.set("dataInicio", filters.dataInicio);
  if (filters.dataFim) params.set("dataFim", filters.dataFim);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const fetchRankingResumo = (filters?: RankingFilters) =>
  backendJson<RankingResumo>(`/api/dashboard/ranking${buildQuery(filters)}`);
