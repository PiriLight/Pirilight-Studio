"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { WorkStatusBadge } from "@/components/domain/work-status-badge";
import { MaintenanceDueLabel } from "@/components/maintenance/maintenance-due-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { priorityLabel } from "@/lib/constants/labels";
import { projectDetailHref } from "@/lib/data/project-overview";
import { formatDateDisplay } from "@/lib/utils/format";
import type { MaintenanceListRow, User } from "@/types";

interface MaintenanceDetailDialogProps {
  row: MaintenanceListRow | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  userById: Map<string, User>;
  today: string;
}

/**
 * Detalhe de um pedido — `Dialog` reutilizado (mesma decisão do Goal Detail,
 * Round 8): não há razão arquitetural para uma rota `/maintenance/[id]`
 * própria, o padrão `Dialog` já cobre criar/editar em todo o resto da app.
 */
export function MaintenanceDetailDialog({ row, onOpenChange, onEdit, userById, today }: MaintenanceDetailDialogProps) {
  return (
    <Dialog open={row !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {row && <MaintenanceDetailBody row={row} onEdit={onEdit} userById={userById} today={today} />}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function MaintenanceDetailBody({
  row,
  onEdit,
  userById,
  today,
}: {
  row: MaintenanceListRow;
  onEdit: () => void;
  userById: Map<string, User>;
  today: string;
}) {
  const { request, project, business } = row;
  const responsible = request.responsibleUserId ? userById.get(request.responsibleUserId) : undefined;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6">{request.title}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <WorkStatusBadge status={request.status} />
          {request.waitingReason !== null && <WaitingReasonTag reason={request.waitingReason} />}
          <span className="text-sm text-muted-foreground">{priorityLabel(request.priority)}</span>
        </div>

        <Field label="Descrição">
          <p className="whitespace-pre-wrap text-foreground">{request.description}</p>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Negócio">
            <Link href={`/businesses/${business.id}`} className="hover:text-info hover:underline">
              {business.name}
            </Link>
          </Field>
          <Field label="Projeto">
            <Link href={projectDetailHref(project)} className="hover:text-info hover:underline">
              {project.name}
            </Link>
          </Field>
          <Field label="Responsável">{responsible?.name ?? "Não atribuído"}</Field>
          <Field label="Data do pedido">{formatDateDisplay(request.requestedAt)}</Field>
        </div>

        <Field label="Prazo / contexto operacional">
          <MaintenanceDueLabel dueDate={request.dueDate} today={today} status={request.status} />
        </Field>

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar pedido
          </Button>
        </div>
      </div>
    </>
  );
}
