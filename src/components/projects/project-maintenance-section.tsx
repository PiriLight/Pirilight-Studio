"use client";

import { useEffect, useMemo, useState } from "react";

import { MaintenanceDetailDialog } from "@/components/maintenance/maintenance-detail-dialog";
import { MaintenanceFormDialog } from "@/components/maintenance/maintenance-form-dialog";
import { MaintenanceListSection } from "@/components/maintenance/maintenance-list-section";
import { NewMaintenanceButton } from "@/components/maintenance/new-maintenance-button";
import { EmptyState } from "@/components/ui/empty-state";
import { groupMaintenanceByTiming } from "@/lib/data/maintenance-board";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import type { Business, MaintenanceListRow, MaintenanceRequest, Project, User } from "@/types";

interface ProjectMaintenanceSectionProps {
  business: Business;
  project: Project;
  users: User[];
  /** Snapshot GLOBAL do servidor — só para semear a `useMaintenanceStore` se ainda não estiver inicializada. */
  initialMaintenanceRequests: MaintenanceRequest[];
  today: string;
}

/**
 * Os pedidos de manutenção do Website/PiriCard Detail — ao vivo (Round 9):
 * lê a mesma `useMaintenanceStore` de `/maintenance`, filtrada por este
 * Project (mesmo princípio de `ProjectTasksSection`/`ProjectRenewalsList`
 * — zero duplicação de estado). "+ Novo pedido" reaproveita o
 * `MaintenanceFormDialog` existente, pré-preenchido com este Project.
 */
export function ProjectMaintenanceSection({
  business,
  project,
  users,
  initialMaintenanceRequests,
  today,
}: ProjectMaintenanceSectionProps) {
  const initialize = useMaintenanceStore((state) => state.initialize);
  const allRequests = useMaintenanceStore((state) => state.requests);
  const [openRow, setOpenRow] = useState<MaintenanceListRow | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    initialize(initialMaintenanceRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const rows = useMemo<MaintenanceListRow[]>(
    () =>
      allRequests
        .filter((request) => request.projectId === project.id)
        .map((request) => ({ request, project, business })),
    [allRequests, project, business],
  );

  const buckets = useMemo(() => groupMaintenanceByTiming(rows, today), [rows, today]);
  const liveOpenRow = useMemo(
    () => (openRow ? (rows.find((row) => row.request.id === openRow.request.id) ?? null) : null),
    [openRow, rows],
  );

  function openEdit(row: MaintenanceListRow) {
    setOpenRow(null);
    setEditingRequest(row.request);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Pedidos de manutenção</h2>
        <NewMaintenanceButton
          projects={[project]}
          businesses={[business]}
          users={users}
          today={today}
          defaultProjectId={project.id}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Sem pedidos" description="Não há pedidos de manutenção associados a este projeto." />
      ) : (
        <div className="flex flex-col gap-4">
          <MaintenanceListSection title="Em atraso" items={buckets.overdue} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
          <MaintenanceListSection title="Hoje" items={buckets.dueToday} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
          <MaintenanceListSection title="Bloqueados" items={buckets.blocked} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
          <MaintenanceListSection title="Próximos 7 dias" items={buckets.dueSoon} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
          <MaintenanceListSection title="Futuras" items={buckets.future} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
          <MaintenanceListSection title="Sem prazo" items={buckets.noDate} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
          <MaintenanceListSection title="À espera do cliente" items={buckets.waitingOnClient} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
          <MaintenanceListSection
            title="Concluídos"
            items={buckets.done}
            today={today}
            userById={userById}
            onOpen={setOpenRow}
            onEdit={openEdit}
            collapsible
          />
        </div>
      )}

      <MaintenanceDetailDialog
        row={liveOpenRow}
        onOpenChange={(open) => {
          if (!open) setOpenRow(null);
        }}
        onEdit={() => {
          if (liveOpenRow) openEdit(liveOpenRow);
        }}
        userById={userById}
        today={today}
      />

      <MaintenanceFormDialog
        key={editingRequest ? editingRequest.id : "closed"}
        open={editingRequest !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRequest(null);
        }}
        request={editingRequest ?? undefined}
        projects={[project]}
        businesses={[business]}
        users={users}
        today={today}
      />
    </section>
  );
}
