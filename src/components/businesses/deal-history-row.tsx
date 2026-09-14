import { DealStageBadge } from "@/components/domain/deal-stage-badge";
import { FollowUpStatus } from "@/components/domain/follow-up-status";
import { Card } from "@/components/ui/card";
import { computeDealFollowUp } from "@/lib/data/business-overview";
import { formatDateDisplay, formatEuros } from "@/lib/utils/format";
import { isOpenDealStage } from "@/lib/validation/deal";
import type { Deal, User } from "@/types";

/**
 * Uma linha do histórico de Deals de um negócio — leitura, sem mudança de
 * stage (isso valida-se no board Comercial). Mostra sempre o stage, porque
 * aqui, ao contrário do board, não há uma coluna a dizer isso por nós.
 */
export function DealHistoryRow({ deal, responsible, today }: { deal: Deal; responsible: User | undefined; today: string }) {
  const { urgency, daysDelta } = computeDealFollowUp(deal, today);
  const isOpen = isOpenDealStage(deal.stage);

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{deal.title}</p>
        <DealStageBadge stage={deal.stage} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {deal.value > 0 && <span>{formatEuros(deal.value)}</span>}
        <span>Responsável: {responsible?.name ?? "—"}</span>
        <span>Último contacto: {formatDateDisplay(deal.lastInteractionDate)}</span>
      </div>

      {isOpen ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{deal.nextAction ?? "Sem próxima ação definida"}</p>
          <FollowUpStatus urgency={urgency} daysDelta={daysDelta} />
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">Oportunidade fechada</p>
      )}
    </Card>
  );
}
