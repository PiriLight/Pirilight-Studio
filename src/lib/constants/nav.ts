import {
  LayoutDashboard,
  ListChecks,
  FolderKanban,
  Users,
  Archive,
  type LucideIcon,
} from "lucide-react";
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  phase: "1A" | "1B";
}
export interface NavGroup {
  label: string | null;
  items: NavItem[];
}
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      {
        label: "Centro de Organização",
        href: "/",
        icon: LayoutDashboard,
        phase: "1A",
      },
    ],
  },
  {
    label: "Trabalho da equipa",
    items: [
      { label: "Tarefas", href: "/tasks", icon: ListChecks, phase: "1A" },
      { label: "Projetos", href: "/projects", icon: FolderKanban, phase: "1A" },
      { label: "Clientes", href: "/clients", icon: Users, phase: "1A" },
    ],
  },
  {
    label: "Referência",
    items: [
      {
        label: "Estrutura anterior",
        href: "/reference",
        icon: Archive,
        phase: "1B",
      },
    ],
  },
];
export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
export function getNavItemByHref(href: string) {
  return ALL_NAV_ITEMS.find(
    (i) => i.href === href || (i.href !== "/" && href.startsWith(i.href + "/")),
  );
}
