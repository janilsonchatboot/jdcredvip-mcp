import type { LucideIcon } from "lucide-react";
import { BarChart, Users, FileText, PhoneCall, Target, Award, Upload, Settings, Cpu, Activity } from "lucide-react";

export type MenuSubEntry = {
  label: string;
  path: string;
  implemented?: boolean;
  roles?: string[];
};

export type MenuEntry = {
  label: string;
  path?: string;
  icon?: LucideIcon;
  implemented?: boolean;
  roles?: string[];
  submenu?: MenuSubEntry[];
};

export const CRM_BRANDING = {
  version: "v3.05",
  slogan: "F\u00e9 que Constroi, Vis\u00e3o que Realisa.",
  footer: "JD CRED VIP CRM v3.05 \u00a9 2025 \u2014 F\u00e9 que Constroi, Vis\u00e3o que Realisa."
};

export const CRM_MENU: MenuEntry[] = [
  { label: "Dashboard", path: "/crm/dashboard", icon: BarChart, implemented: true },
  { label: "Clientes", path: "/crm/clientes", icon: Users, implemented: true },
  { label: "Contratos", path: "/crm/contratos", icon: FileText, implemented: true },
  { label: "Follow-ups", path: "/crm/followups", icon: PhoneCall, implemented: true },
  { label: "Metas", path: "/crm/metas", icon: Target, implemented: true },
  { label: "Ranking", path: "/crm/ranking", icon: Award, implemented: true },
  { label: "Central de Logs", path: "/crm/logs", icon: Activity, implemented: true, roles: ["admin"] },
  { label: "Importacao", path: "/crm/importacao", icon: Upload, implemented: true, roles: ["admin"] },
  {
    label: "Configuracoes",
    path: "/crm/configuracoes",
    icon: Settings,
    implemented: true,
    roles: ["admin"],
    submenu: [
      { label: "Bancos", path: "/crm/configuracoes/bancos", implemented: false, roles: ["admin"] },
      { label: "Promotoras", path: "/crm/configuracoes/promotoras", implemented: false, roles: ["admin"] },
      { label: "Produtos", path: "/crm/configuracoes/produtos", implemented: false, roles: ["admin"] }
    ]
  },
  { label: "IA / Triagem", path: "/crm/triagem", icon: Cpu, implemented: true }
];
