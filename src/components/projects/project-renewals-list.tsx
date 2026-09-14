"use client";

import { useEffect, useMemo, useState } from "react";

import { NewRenewalButton } from "@/components/renewals/new-renewal-button";
import { RenewalActionsMenu } from "@/components/renewals/renewal-actions-menu";
import { RenewalDueLabel } from "@/components/renewals/renewal-due-label";
import { RenewalFormDialog } from "@/components/renewals/renewal-form-dialog";
import { RenewalStatusBadge } from "@/components/renewals/renewal-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { renewalTypeLabel } from "@/lib/constants/labels";
import { formatEuros } from "@/lib/utils/format";
import { useRenewalStore } from "@/store/use-renewal-store";
import type { Business, Project, Renewal } from "@/types";

interface ProjectRenewalsListProps {
  business: Business;
  project: Project;
  /** Snapshot global do servidor — só para semear a `useRenewalStore` se ainda não estiver inicializada. */
  initialRenewals: Renewal[];
  today: string;
}

/**
 * As Renovações do Website/PiriCard Detail — agora ao vivo (Round 6): lê a
 * mesma `useRenewalStore` de `/renewals`, filtrada por este Project (mesmo
 * princípio de `ProjectTasksSection`, Round 5, para Tasks: zero duplicação
 * de estado). "+ Nova renovação" reaproveita o `RenewalFormDialog`
 * existente, pré-preenchido com este Project (`defaultProjectId`) — sem um
 * segundo formulário. Cada linha tem as mesmas ações rápidas de `/renewals`
 * (editar/marcar como renovada/cancelar/reabrir).
 */
export function ProjectRenewalsList({ business, project, initialRenewals, today }: ProjectRenewalsListProps) {
  const initialize = useRenewalStore((state) => state.initialize);
  const allRenewals = useRenewalStore((state) => state.renewals);
  const [editingRenewal, setEditingRenewal] = useState<Renewal | null>(null);

  useEffect(() => {
    initialize(initialRenewals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renewals = useMemo(
    () =>
      allRenewals
        .filter((renewal) => renewal.projectId === project.id)
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0)),
    [allRenewals, project.id],
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Renovação</h2>
        <NewRenewalButton businesses={[business]} projects={[project]} defaultProjectId={project.id} />
      </div>

      {renewals.length === 0 ? (
        <EmptyState title="Sem renovações" description="Não há renovações associadas a este projeto." />
      ) : (
        <ul className="flex flex-col gap-2">
          {renewals.map((renewal) => (
            <li
              key={renewal.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{renewalTypeLabel(renewal.type)}</p>
                <RenewalDueLabel dueDate={renewal.dueDate} today={today} status={renewal.status} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground">{formatEuros(renewal.amount)}</span>
                <RenewalStatusBadge status={renewal.status} />
                <RenewalActionsMenu renewal={renewal} onEdit={() => setEditingRenewal(renewal)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <RenewalFormDialog
        key={editingRenewal ? editingRenewal.id : "closed"}
        open={editingRenewal !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRenewal(null);
        }}
        renewal={editingRenewal ?? undefined}
        businesses={[business]}
        projects={[project]}
      />
    </section>
  );
}
