import { Badge, type BadgeProps } from "@/components/ui/badge";
import { workStatusLabel } from "@/lib/constants/labels";
import type { WorkStatus } from "@/types";

/**
 * Uma só badge para os 5 estados partilhados por Task, Project e
 * MaintenanceRequest — a mesma cor e o mesmo texto em qualquer sítio da app.
 * Nenhum ecrã inventa a sua própria lógica de cor para "À espera do cliente".
 */
const VARIANT_BY_STATUS: Record<WorkStatus, BadgeProps["variant"]> = {
  todo: "outline",
  in_progress: "info",
  waiting_on_client: "secondary",
  blocked: "destructive",
  done: "success",
};

export function WorkStatusBadge({ status, className }: { status: WorkStatus; className?: string }) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]} className={className}>
      {workStatusLabel(status)}
    </Badge>
  );
}
