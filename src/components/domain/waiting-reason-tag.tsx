import {
  Camera,
  CheckCircle2,
  CreditCard,
  FileText,
  HelpCircle,
  KeyRound,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

import { waitingReasonLabel } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import type { WaitingReason } from "@/types";

/**
 * Etiqueta secundária que só faz sentido ao lado de um `WorkStatusBadge` com
 * `waiting_on_client` — diz especificamente o quê. É esta etiqueta que evita
 * que "à espera" seja um beco sem saída: sabe-se sempre à espera de quê.
 */
const ICON_BY_REASON: Record<WaitingReason, LucideIcon> = {
  content: FileText,
  photos: Camera,
  approval: CheckCircle2,
  payment: CreditCard,
  access_login: KeyRound,
  response: MessageCircle,
  other: HelpCircle,
};

export function WaitingReasonTag({
  reason,
  className,
}: {
  reason: WaitingReason;
  className?: string;
}) {
  const Icon = ICON_BY_REASON[reason];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {waitingReasonLabel(reason)}
    </span>
  );
}
