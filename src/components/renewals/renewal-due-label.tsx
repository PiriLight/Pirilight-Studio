import { AlertTriangle, CalendarClock, CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";

import { describeDueDate, type DueDateTone } from "@/lib/utils/date";
import { formatDateDisplay } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { RenewalStatus } from "@/types";

/**
 * Tradução visual da `dueDate` de uma Renewal — mesma convenção de cores já
 * usada em `TaskDueLabel` (Round 4): `overdue`/`today` em laranja de marca,
 * `soon` (1–7 dias) em azul informativo, além disso neutro. Reaproveita
 * `describeDueDate` tal e qual para `pending` — nenhuma tradução nova.
 *
 * `renewed`/`cancelled` nunca mostram "Atrasado", mesmo com `dueDate` no
 * passado — mostram só a data, num tom calmo e histórico (regra central do
 * Round 6: só `pending` pode estar atrasada).
 */
const ICON_BY_TONE: Record<DueDateTone, LucideIcon> = {
  overdue: AlertTriangle,
  today: Clock,
  soon: CalendarClock,
  future: CalendarClock,
  none: CalendarClock,
  waiting: CalendarClock,
};

const TONE_CLASS: Record<DueDateTone, string> = {
  overdue: "text-primary",
  today: "text-primary",
  soon: "text-info",
  future: "text-muted-foreground",
  none: "text-muted-foreground",
  waiting: "text-muted-foreground",
};

export function RenewalDueLabel({
  dueDate,
  today,
  status,
  className,
}: {
  dueDate: string;
  today: string;
  status: RenewalStatus;
  className?: string;
}) {
  if (status !== "pending") {
    const Icon = status === "renewed" ? CheckCircle2 : XCircle;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {formatDateDisplay(dueDate)}
      </span>
    );
  }

  const { label, tone } = describeDueDate(dueDate, today);
  const Icon = ICON_BY_TONE[tone];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", TONE_CLASS[tone], className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
