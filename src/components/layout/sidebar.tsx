"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/store/use-ui-store";
import { cn } from "@/lib/utils";

/**
 * Sidebar de desktop. É "chrome" fixo da marca (bg-chrome, sempre escuro —
 * ver globals.css) mesmo quando o conteúdo principal está em light mode.
 */
export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-chrome-border bg-chrome transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <Logo collapsed={collapsed} />
      </div>

      <Separator className="bg-chrome-border" />

      <NavLinks collapsed={collapsed} />

      <div className={cn("flex p-2", collapsed ? "justify-center" : "justify-end")}>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-chrome-muted-foreground hover:bg-chrome-surface hover:text-chrome-foreground"
          aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
