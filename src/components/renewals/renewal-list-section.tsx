"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { RenewalActionsMenu } from "@/components/renewals/renewal-actions-menu";
import { RenewalDueLabel } from "@/components/renewals/renewal-due-label";
import { RenewalStatusBadge } from "@/components/renewals/renewal-status-badge";
import { EntityListTable, type EntityListColumn } from "@/components/domain/entity-list-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { renewalTypeLabel } from "@/lib/constants/labels";
import { projectDetailHref } from "@/lib/data/project-overview";
import { formatEuros } from "@/lib/utils/format";
import type { Renewal, RenewalListRow, User } from "@/types";

interface RenewalListSectionProps {
  title: string;
  items: RenewalListRow[];
  today: string;
  userById: Map<string, User>;
  onEdit: (renewal: Renewal) => void;
  /** "Renovadas"/"Canceladas" vêm colapsadas por defeito — mesmo padrão do "Fechados" em Comercial (Round 3.1). */
  collapsible?: boolean;
}

/**
 * Uma secção da hierarquia de `/renewals` (heading + contagem + lista) —
 * mesmo padrão de `TaskListSection` (Round 4): reaproveitada tal e qual em
 * qualquer sítio que precise desta hierarquia, para nunca divergir
 * visualmente.
 */
export function RenewalListSection({
  title,
  items,
  today,
  userById,
  onEdit,
  collapsible = false,
}: RenewalListSectionProps) {
  const [expanded, setExpanded] = useState(!collapsible);

  if (items.length === 0) return null;

  const columns: EntityListColumn<RenewalListRow>[] = [
    {
      header: "Renovação",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{renewalTypeLabel(row.renewal.type)}</p>
          <p className="truncate text-xs text-muted-foreground">{formatEuros(row.renewal.amount)}</p>
        </div>
      ),
    },
    {
      header: "Negócio / Projeto",
      cell: (row) => (
        <div className="min-w-0">
          <Link
            href={`/businesses/${row.business.id}`}
            className="block truncate text-sm text-foreground hover:text-info hover:underline"
          >
            {row.business.name}
          </Link>
          <Link
            href={projectDetailHref(row.project)}
            className="block truncate text-xs text-muted-foreground hover:text-info hover:underline"
          >
            {row.project.name}
          </Link>
        </div>
      ),
    },
    { header: "Estado", cell: (row) => <RenewalStatusBadge status={row.renewal.status} /> },
    {
      header: "Prazo",
      cell: (row) => (
        <RenewalDueLabel dueDate={row.renewal.dueDate} today={today} status={row.renewal.status} />
      ),
    },
    {
      header: "Responsável",
      cell: (row) => (
        <ResponsibleCell user={row.responsibleUserId ? userById.get(row.responsibleUserId) : undefined} />
      ),
    },
    {
      header: "",
      className: "w-10",
      cell: (row) => <RenewalActionsMenu renewal={row.renewal} onEdit={() => onEdit(row.renewal)} />,
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
          rowKey={(row) => row.renewal.id}
          columns={columns}
          renderMobileCard={(row) => (
            <RenewalCard row={row} today={today} userById={userById} onEdit={onEdit} />
          )}
        />
      )}
    </div>
  );
}

function ResponsibleCell({ user }: { user: User | undefined }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {user && (
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px]">{user.initials}</AvatarFallback>
        </Avatar>
      )}
      <span>{user?.name ?? "—"}</span>
    </div>
  );
}

function RenewalCard({
  row,
  today,
  userById,
  onEdit,
}: {
  row: RenewalListRow;
  today: string;
  userById: Map<string, User>;
  onEdit: (renewal: Renewal) => void;
}) {
  const responsible = row.responsibleUserId ? userById.get(row.responsibleUserId) : undefined;

  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{renewalTypeLabel(row.renewal.type)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.business.name} · {row.project.name}
          </p>
        </div>
        <RenewalActionsMenu renewal={row.renewal} onEdit={() => onEdit(row.renewal)} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <RenewalStatusBadge status={row.renewal.status} />
        <span className="text-xs text-muted-foreground">{formatEuros(row.renewal.amount)}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-xs">
        <RenewalDueLabel dueDate={row.renewal.dueDate} today={today} status={row.renewal.status} />
        <span className="text-muted-foreground">{responsible?.name ?? "—"}</span>
      </div>
    </Card>
  );
}
