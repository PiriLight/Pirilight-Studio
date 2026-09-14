"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { EntityListTable, type EntityListColumn } from "@/components/domain/entity-list-table";
import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { WorkStatusBadge } from "@/components/domain/work-status-badge";
import { MaintenanceActionsMenu } from "@/components/maintenance/maintenance-actions-menu";
import { MaintenanceDueLabel } from "@/components/maintenance/maintenance-due-label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { priorityLabel } from "@/lib/constants/labels";
import { formatDateDisplay } from "@/lib/utils/format";
import type { MaintenanceListRow, User } from "@/types";

interface MaintenanceListSectionProps {
  title: string;
  items: MaintenanceListRow[];
  today: string;
  userById: Map<string, User>;
  onOpen: (row: MaintenanceListRow) => void;
  onEdit: (row: MaintenanceListRow) => void;
  /** "Concluídos" vem colapsado por defeito — mesmo padrão de Tasks/Renovações. */
  collapsible?: boolean;
}

function AssigneeCell({ user }: { user: User | undefined }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {user && (
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px]">{user.initials}</AvatarFallback>
        </Avatar>
      )}
      <span>{user?.name ?? "Não atribuído"}</span>
    </div>
  );
}

/**
 * Uma secção da hierarquia de `/maintenance` (heading + contagem + lista) —
 * reaproveitada tal e qual na tab Manutenção do Business Detail e na secção
 * do Website/PiriCard Detail, mesmo padrão de `TaskListSection`. Clicar numa
 * linha/card abre o detalhe (`onOpen`) — sem `<Link>` em nenhuma célula, por
 * isso usa `onRowClick` do `EntityListTable` (Round 8).
 */
export function MaintenanceListSection({
  title,
  items,
  today,
  userById,
  onOpen,
  onEdit,
  collapsible = false,
}: MaintenanceListSectionProps) {
  const [expanded, setExpanded] = useState(!collapsible);

  if (items.length === 0) return null;

  const columns: EntityListColumn<MaintenanceListRow>[] = [
    {
      header: "Pedido",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.request.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.business.name} · {row.project.name}
          </p>
          {row.request.waitingReason !== null && (
            <WaitingReasonTag reason={row.request.waitingReason} className="mt-1" />
          )}
        </div>
      ),
    },
    {
      header: "Prioridade",
      cell: (row) => <span className="text-muted-foreground">{priorityLabel(row.request.priority)}</span>,
    },
    { header: "Estado", cell: (row) => <WorkStatusBadge status={row.request.status} /> },
    { header: "Responsável", cell: (row) => <AssigneeCell user={userById.get(row.request.responsibleUserId ?? "")} /> },
    {
      header: "Pedido em",
      cell: (row) => <span className="text-muted-foreground">{formatDateDisplay(row.request.requestedAt)}</span>,
    },
    {
      header: "Prazo",
      cell: (row) => (
        <MaintenanceDueLabel dueDate={row.request.dueDate} today={today} status={row.request.status} />
      ),
    },
    {
      header: "",
      className: "w-10",
      cell: (row) => (
        // A célula de ações vive dentro de uma linha clicável (onRowClick abre o
        // detalhe) — sem isto, abrir o menu ou escolher uma ação também abriria
        // o Dialog de detalhe por baixo, por causa do bubbling do clique.
        <div onClick={(event) => event.stopPropagation()}>
          <MaintenanceActionsMenu request={row.request} onEdit={() => onEdit(row)} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => collapsible && setExpanded((value) => !value)}
        className="flex items-center justify-between px-0.5 text-left"
        disabled={!collapsible}
      >
        <h2 className="text-sm font-semibold text-foreground">
          {title} <span className="font-normal text-muted-foreground">({items.length})</span>
        </h2>
        {collapsible && (
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {expanded ? "Esconder" : "Mostrar"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        )}
      </button>

      {expanded && (
        <EntityListTable
          rows={items}
          rowKey={(row) => row.request.id}
          columns={columns}
          onRowClick={onOpen}
          renderMobileCard={(row) => (
            <MaintenanceCard row={row} today={today} userById={userById} onOpen={onOpen} onEdit={onEdit} />
          )}
        />
      )}
    </div>
  );
}

function MaintenanceCard({
  row,
  today,
  userById,
  onEdit,
}: {
  row: MaintenanceListRow;
  today: string;
  userById: Map<string, User>;
  onOpen: (row: MaintenanceListRow) => void;
  onEdit: (row: MaintenanceListRow) => void;
}) {
  const user = userById.get(row.request.responsibleUserId ?? "");

  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.request.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.business.name} · {row.project.name}
          </p>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <MaintenanceActionsMenu request={row.request} onEdit={() => onEdit(row)} />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <WorkStatusBadge status={row.request.status} />
        {row.request.waitingReason !== null && <WaitingReasonTag reason={row.request.waitingReason} />}
        <span className="text-xs text-muted-foreground">{priorityLabel(row.request.priority)}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-xs">
        <MaintenanceDueLabel dueDate={row.request.dueDate} today={today} status={row.request.status} />
        <AssigneeCell user={user} />
      </div>
    </Card>
  );
}
