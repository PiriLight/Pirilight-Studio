"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatEuros } from "@/lib/utils/format";
import type { CommercialDealCard } from "@/types";

interface ClosedDealsSectionProps {
  cards: CommercialDealCard[];
}

/**
 * Ganho/Perdido saem da fita de scroll principal — já fecharam, já não pedem
 * uma próxima ação. Ficam aqui como histórico compacto, colapsado por
 * defeito para não competir por espaço com os negócios que ainda estão em
 * jogo. Sem `FollowUpStatus` nem dropdown de stage: nada disto muda mais.
 */
export function ClosedDealsSection({ cards }: ClosedDealsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (cards.length === 0) {
    return null;
  }

  const won = cards.filter((card) => card.deal.stage === "won");
  const lost = cards.filter((card) => card.deal.stage === "lost");

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-semibold text-foreground">
          Fechados <span className="font-normal text-muted-foreground">({cards.length})</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {expanded ? "Esconder" : "Mostrar"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-6 border-t border-border px-4 py-4 sm:grid-cols-2">
          <ClosedColumn title="Ganhos" cards={won} />
          <ClosedColumn title="Perdidos" cards={lost} />
        </div>
      )}
    </div>
  );
}

function ClosedColumn({ title, cards }: { title: string; cards: CommercialDealCard[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({cards.length})
      </h3>
      {cards.length === 0 ? (
        <p className="py-1.5 text-xs text-muted-foreground">Sem negócios</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {cards.map(({ deal, business }) => (
            <li key={deal.id}>
              <Link
                href={`/businesses/${business.id}`}
                className="flex items-center justify-between gap-2 py-2 text-sm text-foreground hover:text-info hover:underline"
              >
                <span className="truncate">{business.name}</span>
                {deal.value > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground">{formatEuros(deal.value)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
