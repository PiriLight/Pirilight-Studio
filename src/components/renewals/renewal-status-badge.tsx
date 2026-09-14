import { Badge, type BadgeProps } from "@/components/ui/badge";
import { renewalStatusLabel } from "@/lib/constants/labels";
import type { RenewalStatus } from "@/types";

/**
 * O estado guardado da Renewal — diferente da urgência temporal
 * (`RenewalDueLabel`), de propósito (secção 13 do Round 6): `pending` é um
 * tratamento calmo/informativo, `renewed` é verde de sucesso, `cancelled` é
 * neutro. Vermelho fica reservado para bloqueios reais — nunca para uma
 * renovação simplesmente atrasada (isso é `RenewalDueLabel`, a laranja).
 */
const VARIANT_BY_STATUS: Record<RenewalStatus, BadgeProps["variant"]> = {
  pending: "info",
  renewed: "success",
  cancelled: "outline",
};

export function RenewalStatusBadge({ status, className }: { status: RenewalStatus; className?: string }) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]} className={className}>
      {renewalStatusLabel(status)}
    </Badge>
  );
}
