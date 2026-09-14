import { CalendarClock } from "lucide-react";

import { FollowUpStatus } from "@/components/domain/follow-up-status";
import { toFollowUpUrgency } from "@/lib/data/business-overview";
import { cn } from "@/lib/utils";
import type { NextAction } from "@/types";

/**
 * A parte "timing" de uma `NextAction` (Business ou Project) — o pedaço
 * secundário sob o título. Reaproveita `FollowUpStatus`, exceto quando
 * `nextAction.urgency === "no_date"` (Round 5.2): aí mostra "Sem data", em
 * vez do "Sem próxima ação" que `FollowUpStatus` mostra para `null`/`null` —
 * são coisas diferentes. "Sem próxima ação" significa que não há candidato
 * nenhum (ex.: um Deal sem `nextActionDate` e sem estar parado); "Sem data"
 * significa que HÁ uma ação real (o título já a mostra), só não tem prazo.
 */
export function NextActionTiming({
  nextAction,
  className,
}: {
  nextAction: NextAction;
  className?: string;
}) {
  if (nextAction.urgency === "no_date") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        Sem data
      </span>
    );
  }

  return (
    <FollowUpStatus
      urgency={toFollowUpUrgency(nextAction.urgency)}
      daysDelta={nextAction.daysDelta}
      className={className}
    />
  );
}
