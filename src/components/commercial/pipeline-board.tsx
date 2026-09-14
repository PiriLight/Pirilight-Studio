"use client";

import { useMemo, useState } from "react";

import { ClosedDealsSection } from "@/components/commercial/closed-deals-section";
import { DealCard } from "@/components/commercial/deal-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DEAL_STAGE_LABELS } from "@/lib/constants/labels";
import { DEAL_STAGES, isOpenDealStage } from "@/lib/validation/deal";
import type { CommercialDealCard, DealStage, User } from "@/types";

/** As 4 colunas abertas — Ganho/Perdido saem da fita e vão para "Fechados". */
const OPEN_DEAL_STAGES = DEAL_STAGES.filter(isOpenDealStage);

interface PipelineBoardProps {
  cards: CommercialDealCard[];
  responsibleById: Record<string, User>;
  today: string;
}

/**
 * Board horizontal com scroll controlado — a mesma estrutura em desktop e em
 * mobile, só a largura do ecrã muda quantas colunas se veem de uma vez.
 *
 * A mudança de stage é **estado local, não persistido**: serve para validar a
 * interação (pedida explicitamente no Round 3), não é a camada de escrita a
 * sério — essa só chega com as stores de domínio, mais tarde. Um refresh da
 * página repõe o stage original vindo de `lib/data`.
 */
export function PipelineBoard({ cards, responsibleById, today }: PipelineBoardProps) {
  const [stageOverrides, setStageOverrides] = useState<Record<string, DealStage>>({});

  const columns = useMemo(() => {
    const effective = cards.map((card) => {
      const overriddenStage = stageOverrides[card.deal.id];
      return overriddenStage === undefined
        ? card
        : { ...card, deal: { ...card.deal, stage: overriddenStage } };
    });

    const openColumns = OPEN_DEAL_STAGES.map((stage) => ({
      stage,
      cards: effective
        .filter((card) => card.deal.stage === stage)
        .sort((a, b) => (a.daysDelta ?? Infinity) - (b.daysDelta ?? Infinity)),
    }));
    const closedCards = effective.filter((card) => !isOpenDealStage(card.deal.stage));

    return { openColumns, closedCards };
  }, [cards, stageOverrides]);

  if (cards.length === 0) {
    return <EmptyState title="Sem negócios em curso" description="Ainda não há deals registados." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {columns.openColumns.map((column) => (
          <div key={column.stage} className="flex w-[280px] shrink-0 snap-start flex-col gap-3 sm:w-72">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-sm font-semibold text-foreground">{DEAL_STAGE_LABELS[column.stage]}</h2>
              <span className="text-xs text-muted-foreground">{column.cards.length}</span>
            </div>

            <div className="flex flex-col gap-3">
              {column.cards.map((card) => (
                <DealCard
                  key={card.deal.id}
                  card={card}
                  responsible={responsibleById[card.deal.responsibleUserId]}
                  today={today}
                  onChangeStage={(stage) =>
                    setStageOverrides((prev) => ({ ...prev, [card.deal.id]: stage }))
                  }
                />
              ))}
              {column.cards.length === 0 && (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  Sem negócios
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <ClosedDealsSection cards={columns.closedCards} />
    </div>
  );
}
