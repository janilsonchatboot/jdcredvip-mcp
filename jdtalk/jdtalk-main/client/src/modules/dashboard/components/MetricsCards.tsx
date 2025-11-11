import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { DashboardComparison, DashboardMetrics } from "../services/dashboard.api";

const METRIC_CONFIG: {
  key: keyof DashboardMetrics;
  label: string;
  tooltip: string;
  formatter: (value: number) => string;
}[] = [
  {
    key: "totalContratos",
    label: "Total de contratos",
    tooltip: "Contratos confirmados no período selecionado.",
    formatter: (value) => formatNumber(value)
  },
  {
    key: "volumeLiquido",
    label: "Volume líquido",
    tooltip: "Somatório líquido das operações aprovadas.",
    formatter: (value) => formatCurrency(value)
  },
  {
    key: "volumeBruto",
    label: "Volume bruto",
    tooltip: "Volume contratado antes de taxas e ajustes.",
    formatter: (value) => formatCurrency(value)
  },
  {
    key: "comissaoTotal",
    label: "Comissão total",
    tooltip: "Comissões previstas/confirmadas no período.",
    formatter: (value) => formatCurrency(value)
  },
  {
    key: "ticketMedio",
    label: "Ticket médio",
    tooltip: "Valor médio por contrato aprovado.",
    formatter: (value) => formatCurrency(value)
  },
  {
    key: "promotorasAtivas",
    label: "Promotoras ativas",
    tooltip: "Quantidade de promotoras com contratos no período.",
    formatter: (value) => formatNumber(value)
  }
];

type MetricsCardsProps = {
  metrics: DashboardMetrics | null | undefined;
  comparison: DashboardComparison;
};

const VariationBadge = ({ value }: { value: { percent: number; absolute: number } | null }) => {
  if (!value) return null;
  const positive = value.absolute >= 0;
  const colorClass = positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700";
  const prefix = positive ? "+" : "";
  return (
    <Badge className={`text-xs font-medium ${colorClass}`}>
      {prefix}
      {value.percent.toFixed(1)}%
    </Badge>
  );
};

export function MetricsCards({ metrics, comparison }: MetricsCardsProps) {
  if (!metrics) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={`metric-skeleton-${index}`}>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-24 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const deltas = comparison?.delta ?? {};

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {METRIC_CONFIG.map((metric) => {
        const value = metrics[metric.key];
        const delta = (deltas as Record<string, { percent: number; absolute: number }>)[metric.key] ?? null;
        return (
          <Card key={metric.key}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="flex items-center gap-2">
                <CardDescription>{metric.label}</CardDescription>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{metric.tooltip}</TooltipContent>
                </Tooltip>
              </div>
              <VariationBadge value={delta} />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl font-semibold">{metric.formatter(value ?? 0)}</CardTitle>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
