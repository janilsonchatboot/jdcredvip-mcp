import { useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  DashboardFilters,
  DashboardInsights,
  DashboardResponse,
  DashboardTrendResponse,
  IntegrationResumo,
  RankingSnapshot,
  fetchDashboardInsights,
  fetchDashboardMeta,
  fetchDashboardTrend,
  fetchIntegrationResumo,
  fetchTopRanking
} from "../services/dashboard.api";
import { useDateRangeContext } from "@/contexts/DashboardFilterContext";

const buildFilters = (filters?: DashboardFilters): DashboardFilters | undefined => {
  if (!filters) return undefined;
  const payload: DashboardFilters = {};
  if (filters.promotora) payload.promotora = filters.promotora;
  if (filters.produto) payload.produto = filters.produto;
  if (filters.status) payload.status = filters.status;
  if (filters.dataInicio) payload.dataInicio = filters.dataInicio;
  if (filters.dataFim) payload.dataFim = filters.dataFim;
  return payload;
};

export type DashboardDataResult = {
  meta: DashboardResponse;
  insights: DashboardInsights | null;
  trend: DashboardTrendResponse;
  ranking: RankingSnapshot;
  integracoes: IntegrationResumo | undefined;
};

export function useDashboardData(filters?: DashboardFilters): DashboardDataResult {
  const normalizedFilters = useMemo(
    () => buildFilters(filters),
    [filters?.dataInicio, filters?.dataFim, filters?.promotora, filters?.produto, filters?.status]
  );

  const metaQuery = useSuspenseQuery({
    queryKey: ["jdcredvip", "dashboard", "meta"],
    queryFn: fetchDashboardMeta,
    staleTime: 600_000
  });

  const insightsQuery = useSuspenseQuery({
    queryKey: ["jdcredvip", "dashboard", "insights", normalizedFilters],
    queryFn: () => fetchDashboardInsights(normalizedFilters),
    refetchInterval: 60_000
  });

  const trendQuery = useSuspenseQuery({
    queryKey: ["jdcredvip", "dashboard", "trend", normalizedFilters],
    queryFn: () => fetchDashboardTrend(normalizedFilters),
    refetchInterval: 120_000
  });

  const rankingQuery = useSuspenseQuery({
    queryKey: ["jdcredvip", "dashboard", "ranking", "top5", normalizedFilters],
    queryFn: () => fetchTopRanking(5, normalizedFilters),
    refetchInterval: 90_000
  });

  const integracoesQuery = useQuery({
    queryKey: ["jdcredvip", "integracoes", "status"],
    queryFn: fetchIntegrationResumo,
    refetchInterval: 90_000
  });

  return {
    meta: metaQuery.data,
    insights: insightsQuery.data,
    trend: trendQuery.data,
    ranking: rankingQuery.data,
    integracoes: integracoesQuery.data
  };
}

export function useGlobalDashboardData() {
  const { dateInicio, dateFim } = useDateRangeContext();
  return useDashboardData({
    dataInicio: dateInicio || undefined,
    dataFim: dateFim || undefined
  });
}
