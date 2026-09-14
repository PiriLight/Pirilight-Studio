"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Evita mismatch de hidratação: o servidor não sabe o tema real (só o
// cliente, depois de o next-themes ler o localStorage). useSyncExternalStore
// dá "false" no snapshot do servidor e "true" assim que monta no cliente,
// sem precisar de setState dentro de um efeito.
function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-chrome-foreground hover:bg-chrome-surface hover:text-chrome-foreground"
          aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isDark ? "Modo claro" : "Modo escuro"}
      </TooltipContent>
    </Tooltip>
  );
}
