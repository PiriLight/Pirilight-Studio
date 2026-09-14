import { AlertTriangle, CalendarClock, Clock, PauseCircle, type LucideIcon } from "lucide-react";

import { describeDueDate, describeWaitingDueDate, type DueDateTone } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { WorkStatus } from "@/types";

/**
 * Tradução visual da data de uma Task — o único sítio onde isto vira texto.
 * `overdue`/`today` usam o laranja de marca (`primary`, mesma convenção do
 * Round 3.1), `soon` um azul informativo, `future`/`none`/`waiting` ficam
 * neutros.
 *
 * `waiting_on_client` nunca passa por `describeDueDate` — usa sempre
 * `describeWaitingDueDate`, que não produz "Atrasado", mesmo com `dueDate`
 * no passado (Round 4.1: "À espera do cliente" não é trabalho nosso
 * atrasado, regra central desde o Round 2).
 */
const ICON_BY_TONE: Record<DueDateTone, LucideIcon> = {
  overdue: AlertTriangle,
  today: Clock,
  soon: CalendarClock,
  future: CalendarClock,
  none: CalendarClock,
  waiting: PauseCircle,
};

const TONE_CLASS: Record<DueDateTone, string> = {
  overdue: "text-primary",
  today: "text-primary",
  soon: "text-info",
  future: "text-muted-foreground",
  none: "text-muted-foreground italic",
  waiting: "text-muted-foreground",
};

export function TaskDueLabel({
  dueDate,
  today,
  status,
  className,
}: {
  dueDate: string | null;
  today: string;
  status: WorkStatus;
  className?: string;
}) {
  const { label, tone } = status === "waiting_on_client" ? describeWaitingDueDate(dueDate) : describeDueDate(dueDate, today);
  const Icon = ICON_BY_TONE[tone];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", TONE_CLASS[tone], className)}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
