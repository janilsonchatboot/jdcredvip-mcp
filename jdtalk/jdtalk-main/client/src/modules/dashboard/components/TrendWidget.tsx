import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from "recharts";
import { DashboardTrendResponse } from "../services/dashboard.api";
import { formatCurrency } from "@/lib/formatters";

type TrendWidgetProps = {
  data: DashboardTrendResponse;
};

const mergeSeries = (
  current: { data: string; value: number }[],
  previous: { data: string; value: number }[]
) => {
  const map = new Map<string, { data: string; current: number; previous: number }>();

  current.forEach((item) => {
    map.set(item.data, { data: item.data, current: item.value, previous: 0 });
  });

  previous.forEach((item) => {
    if (map.has(item.data)) {
      map.get(item.data)!.previous = item.value;
    } else {
      map.set(item.data, { data: item.data, current: 0, previous: item.value });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
};

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null;
  const [current, previous] = payload;
  return (
    <div className="rounded border bg-background px-3 py-2 shadow">
      <p className="text-sm font-semibold">{current?.payload?.data}</p>
      <p className="text-xs text-emerald-600">Atual: {formatCurrency(current?.value ?? 0)}</p>
      <p className="text-xs text-muted-foreground">Anterior: {formatCurrency(previous?.value ?? 0)}</p>
    </div>
  );
};

export function TrendWidget({ data }: TrendWidgetProps) {
  const [dataset, setDataset] = useState<"volume" | "comissao">("volume");
  const [mode, setMode] = useState<"line" | "bar">("line");

  const chartData = useMemo(() => {
    if (!data?.series) return [];
    if (dataset === "volume") {
      const current = data.series.contratos.current.map((row) => ({
        data: row.data,
        value: row.volumeLiquido
      }));
      const previous = data.series.contratos.previous.map((row) => ({
        data: row.data,
        value: row.volumeLiquido
      }));
      return mergeSeries(current, previous);
    }
    const current = data.series.comissoes.current.map((row) => ({
      data: row.data,
      value: row.comissaoTotal
    }));
    const previous = data.series.comissoes.previous.map((row) => ({
      data: row.data,
      value: row.comissaoTotal
    }));
    return mergeSeries(current, previous);
  }, [data, dataset]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Evolução temporal</CardTitle>
          <CardDescription>Comparativo atual vs período anterior.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={dataset} onValueChange={(value) => setDataset(value as "volume" | "comissao")}>
            <TabsList>
              <TabsTrigger value="volume">Volume líquido</TabsTrigger>
              <TabsTrigger value="comissao">Comissão</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1 rounded border p-1">
            <Button variant={mode === "line" ? "default" : "ghost"} size="sm" onClick={() => setMode("line")}>
              Linhas
            </Button>
            <Button variant={mode === "bar" ? "default" : "ghost"} size="sm" onClick={() => setMode("bar")}>
              Barras
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-80">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            {mode === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="current" name="Atual" stroke="#2563eb" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="Anterior"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="current" name="Atual" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" name="Anterior" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados suficientes para montar o comparativo.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
