import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A Sidebar/Topbar são "chrome" fixo (sempre escuro — ver globals.css),
 * por isso usamos sempre a variante clara do símbolo, independentemente
 * do tema ativo no conteúdo principal.
 */
export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 px-1 py-1 text-chrome-foreground",
        collapsed && "justify-center",
      )}
    >
      <Image
        src="/pirilight-header-icon.png"
        alt="PiriLight Studio"
        width={28}
        height={28}
        className="shrink-0"
        priority
      />
      {!collapsed && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">PiriLight Studio</span>
          <span className="text-[11px] text-chrome-muted-foreground">Centro de Comando</span>
        </span>
      )}
    </Link>
  );
}
