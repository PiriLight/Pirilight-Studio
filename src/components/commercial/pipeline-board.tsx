"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { changeDealStageAction } from "@/app/actions/crm";
import { ClosedDealsSection } from "@/components/commercial/closed-deals-section";
import { DealCard } from "@/components/commercial/deal-card";
import { DealFormDialog } from "@/components/crm/deal-form-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DEAL_STAGE_LABELS } from "@/lib/constants/labels";
import type { ContactRow, DealRow } from "@/lib/data/supabase/operational";
import { DEAL_STAGES, isOpenDealStage } from "@/lib/validation/deal";
import type { Business, CommercialDealCard, DealStage, User } from "@/types";

const OPEN_DEAL_STAGES = DEAL_STAGES.filter(isOpenDealStage);

interface PipelineBoardProps {
  cards: CommercialDealCard[];
  responsibleById: Record<string, User>;
  today: string;
  crmEnabled?: boolean;
  businesses?: Business[];
  contacts?: ContactRow[];
  dealRows?: DealRow[];
}

export function PipelineBoard({
  cards,
  responsibleById,
  today,
  crmEnabled = false,
  businesses = [],
  contacts = [],
  dealRows = [],
}: PipelineBoardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stageOverrides, setStageOverrides] = useState<Record<string, DealStage>>({});
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [editingDealId, setEditingDealId] = useState<string | "new" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const users = Object.values(responsibleById);

  const columns = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const effective = cards
      .map((card) => {
        const overriddenStage = stageOverrides[card.deal.id];
        return overriddenStage === undefined
          ? card
          : { ...card, deal: { ...card.deal, stage: overriddenStage } };
      })
      .filter((card) => {
        const matchesQuery = !needle || `${card.business.name} ${card.deal.title}`.toLowerCase().includes(needle);
        const matchesStage = stageFilter === "all" || card.deal.stage === stageFilter;
        const matchesOwner = ownerFilter === "all" || card.deal.responsibleUserId === ownerFilter;
        return matchesQuery && matchesStage && matchesOwner;
      });

    return {
      openColumns: OPEN_DEAL_STAGES.map((stage) => ({
        stage,
        cards: effective
          .filter((card) => card.deal.stage === stage)
          .sort((a, b) => (a.daysDelta ?? Infinity) - (b.daysDelta ?? Infinity)),
      })),
      closedCards: effective.filter((card) => !isOpenDealStage(card.deal.stage)),
    };
  }, [cards, ownerFilter, query, stageFilter, stageOverrides]);

  function changeStage(id: string, stage: DealStage) {
    if (!crmEnabled) {
      setStageOverrides((previous) => ({ ...previous, [id]: stage }));
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await changeDealStageAction(id, stage);
      setFeedback(result.message);
      if (result.ok) {
        setStageOverrides((previous) => ({ ...previous, [id]: stage }));
        router.refresh();
      }
    });
  }

  const editingDeal = editingDealId && editingDealId !== "new"
    ? dealRows.find((deal) => deal.id === editingDealId)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar oportunidades…" className="pl-8" />
          </div>
          <Select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as DealStage | "all")}>
            <option value="all">Todos os stages</option>
            {DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{DEAL_STAGE_LABELS[stage]}</option>)}
          </Select>
          <Select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="all">Todos os responsáveis</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </Select>
        </div>
        {crmEnabled && (
          <Button type="button" onClick={() => setEditingDealId("new")} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Nova oportunidade
          </Button>
        )}
      </div>

      {feedback && <p aria-live="polite" className="text-sm text-muted-foreground">{feedback}</p>}

      {cards.length === 0 ? (
        <EmptyState title="Sem negócios em curso" description="Ainda não há oportunidades registadas." />
      ) : (
        <>
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
                      onChangeStage={(stage) => changeStage(card.deal.id, stage)}
                      onEdit={crmEnabled ? () => setEditingDealId(card.deal.id) : undefined}
                    />
                  ))}
                  {column.cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">Sem negócios</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <ClosedDealsSection cards={columns.closedCards} onEdit={crmEnabled ? setEditingDealId : undefined} />
        </>
      )}

      {crmEnabled && editingDealId && (
        <DealFormDialog
          key={editingDealId}
          open
          onOpenChange={(open) => { if (!open) setEditingDealId(null); }}
          businesses={businesses}
          contacts={contacts}
          users={users}
          deal={editingDeal}
          onSuccess={setFeedback}
        />
      )}
      {pending && <span className="sr-only" aria-live="polite">A guardar alteração…</span>}
    </div>
  );
}
