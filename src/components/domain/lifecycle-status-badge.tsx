import { Badge, type BadgeProps } from "@/components/ui/badge";
import { lifecycleStatusLabel } from "@/lib/constants/labels";
import type { LifecycleStatus } from "@/types";

/**
 * Progressão visual do ciclo de vida do Business — a mesma badge em
 * Comercial, Clientes e no Business Detail Hub, porque é sempre o mesmo
 * registo, só visto de ângulos diferentes.
 */
const VARIANT_BY_STATUS: Record<LifecycleStatus, BadgeProps["variant"]> = {
  prospect: "outline",
  lead: "secondary",
  interested: "info",
  client: "success",
  inactive: "muted",
};

export function LifecycleStatusBadge({
  status,
  className,
}: {
  status: LifecycleStatus;
  className?: string;
}) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]} className={className}>
      {lifecycleStatusLabel(status)}
    </Badge>
  );
}
