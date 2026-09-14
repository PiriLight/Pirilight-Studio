import { Badge } from "@/components/ui/badge";
import { goalStatusLabel } from "@/lib/constants/labels";
import { deriveGoalStatus } from "@/lib/data/goal-board";

/**
 * `done` em verde (`success`, mesma convenção de `WorkStatusBadge`), `in_progress`
 * em azul informativo — nunca vermelho: um Goal em curso não é um problema.
 */
export function GoalStatusBadge({ progress, className }: { progress: number; className?: string }) {
  const status = deriveGoalStatus(progress);

  return (
    <Badge variant={status === "done" ? "success" : "info"} className={className}>
      {goalStatusLabel(status)}
    </Badge>
  );
}
