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

interface BusinessMaintenanceTabProps {
  business: Business;
  /** Projects deste negócio — universo do select "Projeto" do formulário. */
  projects: Project[];
  users: User[];
  /** Snapshot GLOBAL do servidor — só para semear a `useMaintenanceStore` se ainda não estiver inicializada. */
  initialMaintenanceRequests: MaintenanceRequest[];
  today: string;
}

/**
 * A tab "Manutenção" do Business Detail Hub — ao vivo, mesma `useMaintenanceStore`
 * de `/maintenance` (Round 9), filtrada a este negócio (`businessId` direto,
 * sem indireção polimórfica — ao contrário de Task). Mesmo padrão de
 * `BusinessTasksTab`/`LiveBusinessRenewals`: zero duplicação de estado, uma
 * mudança feita aqui ou em `/maintenance` aparece nos dois sítios de imediato.
 */
export function BusinessMaintenanceTab({
  business,
  projects,
  users,
  initialMaintenanceRequests,
  today,
}: BusinessMaintenanceTabProps) {
  const initialize = useMaintenanceStore((state) => state.initialize);
  const allRequests = useMaintenanceStore((state) => state.requests);
  const [openRow, setOpenRow] = useState<MaintenanceListRow | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    initialize(initialMaintenanceRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const rows = useMemo(() => {
    const result: MaintenanceListRow[] = [];
    for (const request of allRequests) {
      if (request.businessId !== business.id) continue;
      const project = projectById.get(request.projectId);
      if (project === undefined) continue;
      result.push({ request, project, business });
    }
    return result;
  }, [allRequests, business, projectById]);

  const buckets = useMemo(() => groupMaintenanceByTiming(rows, today), [rows, today]);
  const liveOpenRow = useMemo(
    () => (openRow ? (rows.find((row) => row.request.id === openRow.request.id) ?? null) : null),
    [openRow, rows],
  );

  function openEdit(row: MaintenanceListRow) {
    setOpenRow(null);
    setEditingRequest(row.request);
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState title="Sem pedidos" description="Nenhum pedido de manutenção ligado a este negócio." />
        <div className="flex justify-end">
          <NewMaintenanceButton projects={projects} businesses={[business]} users={users} today={today} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <NewMaintenanceButton projects={projects} businesses={[business]} users={users} today={today} />
      </div>

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
        projects={projects}
        businesses={[business]}
        users={users}
        today={today}
      />
    </div>
  );
}
