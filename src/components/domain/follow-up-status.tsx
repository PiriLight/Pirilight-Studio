import { AlertTriangle, CalendarClock, Clock, PauseCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Urgency } from "@/types";

/**
 * Indicador compacto de urgência de follow-up — usado no board Comercial e no
 * separador Comercial do Business Detail Hub. Recebe diretamente o resultado
 * de `computeDealFollowUp` (`lib/data/business-overview.ts`): não reimplementa
 * a regra de urgência, só a apresenta.
 *
 * Contido de propósito: `overdue` e `due_today` usam o laranja de marca
 * (`--primary`, reservado para ações importantes — ver globals.css) porque um
 * follow-up em atraso é urgência normal, não uma escalada. Vermelho
 * (`destructive`) fica reservado só para `Bloqueado`. `due_soon` e `stalled`
 * ficam em tons calmos.
 */
interface FollowUpStatusProps {
  urgency: Urgency | null;
  daysDelta: number | null;
  className?: string;
}

export function FollowUpStatus({ urgency, daysDelta, className }: FollowUpStatusProps) {
  const content = describe(urgency, daysDelta);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", content.tone, className)}
    >
      <content.icon className="h-3.5 w-3.5 shrink-0" />
      {content.text}
    </span>
  );
}

function describe(urgency: Urgency | null, daysDelta: number | null) {
  if (urgency === "overdue" && daysDelta !== null) {
    return { icon: AlertTriangle, tone: "text-primary", text: `Atrasado há ${-daysDelta} dias` };
  }
  if (urgency === "due_today") {
    return { icon: Clock, tone: "text-primary", text: "Hoje" };
  }
  if (urgency === "due_soon" && daysDelta !== null) {
    return { icon: CalendarClock, tone: "text-info", text: `Em ${daysDelta} dias` };
  }
  if (urgency === "stalled" && daysDelta !== null) {
    return {
      icon: PauseCircle,
      tone: "text-muted-foreground",
      text: `Sem contacto há ${-daysDelta} dias`,
    };
  }
  if (daysDelta !== null) {
    return { icon: CalendarClock, tone: "text-muted-foreground", text: `Em ${daysDelta} dias` };
  }
  return { icon: CalendarClock, tone: "text-muted-foreground", text: "Sem próxima ação" };
}
