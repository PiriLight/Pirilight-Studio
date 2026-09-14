import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { FollowUpStatus } from "@/components/domain/follow-up-status";
import { LifecycleStatusBadge } from "@/components/domain/lifecycle-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEAL_STAGE_LABELS } from "@/lib/constants/labels";
import { diffCalendarDays } from "@/lib/utils/date";
import { formatEuros } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { DEAL_STAGES } from "@/lib/validation/deal";
import type { CommercialDealCard, DealStage, User } from "@/types";

interface DealCardProps {
  card: CommercialDealCard;
  responsible: User | undefined;
  today: string;
  onChangeStage: (stage: DealStage) => void;
}

/**
 * Um card por Deal — mostra só o que ajuda a decidir a próxima ação: quem é
 * o negócio, em que ponto está, de quem é a bola, e há quanto tempo.
 */
export function DealCard({ card, responsible, today, onChangeStage }: DealCardProps) {
  const { deal, business, urgency, daysDelta } = card;
  const daysSinceContact = -diffCalendarDays(deal.lastInteractionDate, today);

  return (
    <Card className="flex flex-col gap-2.5 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/businesses/${business.id}`}
            className="block truncate text-sm font-medium text-foreground hover:text-info hover:underline"
          >
            {business.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{business.industry}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex shrink-0 items-center gap-0.5 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <ChevronDown className="h-3.5 w-3.5" />
            <span className="sr-only">Mudar stage</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {DEAL_STAGES.map((stage) => (
              <DropdownMenuItem
                key={stage}
                disabled={stage === deal.stage}
                onSelect={() => onChangeStage(stage)}
              >
                {DEAL_STAGE_LABELS[stage]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <LifecycleStatusBadge status={business.lifecycleStatus} />
        {deal.value > 0 && (
          <span className="text-xs font-medium text-muted-foreground">{formatEuros(deal.value)}</span>
        )}
      </div>

      {deal.nextAction !== null ? (
        <p className={cn("text-sm", urgency === "overdue" ? "text-foreground" : "text-foreground/90")}>
          {deal.nextAction}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground">Sem próxima ação definida</p>
      )}

      <FollowUpStatus urgency={urgency} daysDelta={daysDelta} />

      <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
        <span>
          Contacto {daysSinceContact <= 0 ? "hoje" : `há ${daysSinceContact} dia${daysSinceContact === 1 ? "" : "s"}`}
        </span>
        {responsible && (
          <span className="flex items-center gap-1.5">
            {responsible.name}
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">{responsible.initials}</AvatarFallback>
            </Avatar>
          </span>
        )}
      </div>
    </Card>
  );
}
