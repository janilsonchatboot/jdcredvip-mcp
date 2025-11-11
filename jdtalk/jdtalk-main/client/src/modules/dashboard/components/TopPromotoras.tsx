import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type PromotoraItem = {
  nome: string;
  totalContratos: number;
  volumeLiquido: number;
};

type TopPromotorasProps = {
  items: PromotoraItem[];
};

export function TopPromotoras({ items }: TopPromotorasProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top 5 promotoras</CardTitle>
          <CardDescription>Ranking consolidado do período selecionado.</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/crm/ranking">Ver ranking</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={item.nome}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="w-8 justify-center">
                  {index + 1}
                </Badge>
                <div>
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(item.totalContratos)} contratos
                  </p>
                </div>
              </div>
              <div className="text-sm font-semibold">{formatCurrency(item.volumeLiquido)}</div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma promotora encontrada.</p>
        )}
      </CardContent>
    </Card>
  );
}
