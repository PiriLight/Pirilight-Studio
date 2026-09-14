import { Badge, type BadgeProps } from "@/components/ui/badge";
import { dealStageLabel } from "@/lib/constants/labels";
import type { DealStage } from "@/types";

/**
 * Cores contidas de propósito: o board Comercial já separa os stages em
 * colunas, a badge só reforça — não precisa de gritar. Laranja/vermelho ficam
 * reservados para urgência de follow-up (`FollowUpStatus`), não para a
 * identidade do stage.
 */
const VARIANT_BY_STAGE: Record<DealStage, BadgeProps["variant"]> = {
  new: "outline",
  contacted: "muted",
  proposal_sent: "secondary",
  negotiating: "info",
  won: "success",
  lost: "outline",
};

export function DealStageBadge({ stage, className }: { stage: DealStage; className?: string }) {
  return (
    <Badge variant={VARIANT_BY_STAGE[stage]} className={className}>
      {dealStageLabel(stage)}
    </Badge>
  );
}
