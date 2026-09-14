import {
  LayoutDashboard,
  ListChecks,
  Target,
  Handshake,
  Users,
  Globe,
  CreditCard,
  Wrench,
  RefreshCw,
  Wallet,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Fase a que este ecrã pertence — só informativo, não muda a navegação. */
  phase: "1A" | "1B";
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

/**
 * Fonte única de verdade da navegação — usada pela Sidebar, pelo MobileNav
 * e pelo PageHeader (para derivar o título da página a partir da rota).
 * Comercial e Clientes apontam para o mesmo dado (Business), só filtrado
 * de forma diferente — ver plano, secção 0.1.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard, phase: "1A" }],
  },
  {
    label: "Trabalho",
    items: [
      { label: "Tarefas", href: "/tasks", icon: ListChecks, phase: "1A" },
      { label: "Objetivos", href: "/goals", icon: Target, phase: "1B" },
    ],
  },
  {
    label: "Negócio",
    items: [
      { label: "Comercial", href: "/commercial", icon: Handshake, phase: "1A" },
      { label: "Clientes", href: "/clients", icon: Users, phase: "1A" },
    ],
  },
  {
    label: "Entrega",
    items: [
      { label: "Websites", href: "/websites", icon: Globe, phase: "1A" },
      { label: "PiriCards", href: "/piricards", icon: CreditCard, phase: "1A" },
      { label: "Manutenção", href: "/maintenance", icon: Wrench, phase: "1B" },
    ],
  },
  {
    label: "Operações",
    items: [
      { label: "Renovações", href: "/renewals", icon: RefreshCw, phase: "1A" },
      { label: "Finanças", href: "/finance", icon: Wallet, phase: "1B" },
    ],
  },
  {
    label: "Recursos",
    items: [{ label: "Materiais", href: "/materials", icon: FolderOpen, phase: "1B" }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function getNavItemByHref(href: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.href === href);
}
