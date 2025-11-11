import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Briefcase,
  Flashlight,
  Gift,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Star
} from "lucide-react";

const COLORS = ["#2563eb", "#7c3aed", "#fb923c", "#22c55e", "#ec4899", "#0ea5e9"];

const PRODUCT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  inss: PiggyBank,
  fgts: Gift,
  trabalhador: Briefcase,
  trabalho: Briefcase,
  luz: Flashlight,
  conta: Flashlight,
  bolsa: ShieldCheck,
  credito: Landmark
};

const getProductIcon = (name: string) => {
  const normalized = name.toLowerCase();
  const key = Object.keys(PRODUCT_ICON_MAP).find((token) => normalized.includes(token));
  const Icon = key ? PRODUCT_ICON_MAP[key] : Star;
  return <Icon className="h-4 w-4 text-primary" />;
};

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded border bg-background px-3 py-2 shadow">
      <p className="text-sm font-semibold">{data.nome}</p>
      <p className="text-xs text-muted-foreground">{formatCurrency(data.volumeLiquido)}</p>
    </div>
  );
};

type ProductsChartProps = {
  data: { nome: string; totalContratos: number; volumeLiquido: number }[];
};

export function ProductsChart({ data }: ProductsChartProps) {
  const totalVolume = data.reduce((acc, item) => acc + item.volumeLiquido, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos destaque</CardTitle>
        <CardDescription>Distribuição de volume líquido por produto.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="h-64">
          {data.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="volumeLiquido" data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${entry.nome}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Sem dados suficientes para o gráfico.
            </div>
          )}
        </div>
        <div className="space-y-3">
          {data.map((item, index) => {
            const percent = totalVolume ? (item.volumeLiquido / totalVolume) * 100 : 0;
            return (
              <div
                key={item.nome}
                className="flex items-center justify-between rounded border px-3 py-2"
                style={{ borderColor: `${COLORS[index % COLORS.length]}33` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">{getProductIcon(item.nome)}</div>
                  <div>
                    <p className="font-semibold">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.volumeLiquido)}</p>
                  </div>
                </div>
                <Badge variant="outline">{percent.toFixed(1)}%</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
