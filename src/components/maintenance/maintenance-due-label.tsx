import { AlertTriangle, CalendarClock, Clock, PauseCircle, type LucideIcon } from "lucide-react";

import { describeDueDate, describeWaitingDueDate, type DueDateTone } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { WorkStatus } from "@/types";

/**
 * Tradução visual da `dueDate` de um MaintenanceRequest — mesma convenção de
 * `TaskDueLabel` (Round 4): `overdue`/`today` em laranja de marca, `soon` em
 * azul informativo. `waiting_on_client` nunca passa por `describeDueDate` —
 * usa sempre `describeWaitingDueDate` (nunca "Atrasado", mesmo com `dueDate`
 * no passado — secção 4 do Round 9, a mesma regra central desde o Round 2).
 *
 * Única diferença de `TaskDueLabel`: "Sem prazo" em vez de "Sem data"
 * (secção 9 do pedido) — só a palavra muda, a lógica de `describeDueDate` é
 * reaproveitada tal e qual.
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

export function MaintenanceDueLabel({
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
  const { label: baseLabel, tone } =
    status === "waiting_on_client" ? describeWaitingDueDate(dueDate) : describeDueDate(dueDate, today);
  const label = tone === "none" ? "Sem prazo" : baseLabel;
  const Icon = ICON_BY_TONE[tone];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", TONE_CLASS[tone], className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
