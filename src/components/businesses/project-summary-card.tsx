import { CreditCard, Globe } from "lucide-react";

import { PaymentProgress } from "@/components/domain/payment-progress";
import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { WorkStatusBadge } from "@/components/domain/work-status-badge";
import { Card } from "@/components/ui/card";
import { formatDateDisplay } from "@/lib/utils/format";
import type { ProjectWithDetail } from "@/types";

/**
 * Cartão de projeto — usado no separador Projetos do Business Detail Hub.
 * Mesmo sem as páginas de Websites/PiriCards estarem funcionais, o projeto já
 * aparece aqui com o que interessa: tipo, estado, motivo da espera (quando
 * aplicável) e o ponto de pagamento.
 */
export function ProjectSummaryCard({ item }: { item: ProjectWithDetail }) {
  const { project, website, piriCard, paymentSummary } = item;
  const Icon = project.type === "website" ? Globe : CreditCard;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-info" />
          <div>
            <p className="text-sm font-medium text-foreground">{project.name}</p>
            <p className="text-xs text-muted-foreground">
              {website ? website.domain : piriCard ? `${piriCard.quantity} unidades` : null}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <WorkStatusBadge status={project.status} />
          {project.waitingReason && <WaitingReasonTag reason={project.waitingReason} />}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Início: {formatDateDisplay(project.startDate)}
        {project.launchDate && ` · Lançamento: ${formatDateDisplay(project.launchDate)}`}
      </p>

      <PaymentProgress summary={paymentSummary} compact />
    </Card>
  );
}
