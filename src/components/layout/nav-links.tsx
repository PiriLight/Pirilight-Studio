"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_GROUPS } from "@/lib/constants/nav";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Lista de navegação partilhada pela Sidebar (desktop) e pelo MobileNav
 * (dentro do Sheet) — a mesma config, dois contentores diferentes.
 */
export function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group, idx) => (
        <div key={group.label ?? `group-${idx}`} className="flex flex-col gap-1">
          {group.label && !collapsed ? (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-chrome-muted-foreground">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-chrome-active text-chrome-foreground"
                    : "text-chrome-muted-foreground hover:bg-chrome-surface hover:text-chrome-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive
                      ? "text-info"
                      : "text-chrome-muted-foreground group-hover:text-chrome-foreground",
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
        </div>
      ))}
    </nav>
  );
}
