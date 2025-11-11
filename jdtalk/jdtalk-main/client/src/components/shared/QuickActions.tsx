import { Button } from "@/components/ui/button";
import { Upload, Award, Target } from "lucide-react";
import { Link } from "wouter";

const ACTIONS = [
  { label: "Nova importação", href: "/crm/importacao", icon: Upload },
  { label: "Abrir ranking", href: "/crm/ranking", icon: Award },
  { label: "Gerenciar metas", href: "/crm/metas", icon: Target }
] as const;

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Button key={action.label} asChild variant="outline" size="sm" className="gap-2">
            <Link href={action.href}>
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
