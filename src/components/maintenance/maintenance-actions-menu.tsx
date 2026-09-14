"use client";

import { Check, ChevronDown, Pencil, PlayCircle, RotateCcw, ShieldAlert } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { waitingReasonLabel } from "@/lib/constants/labels";
import { WAITING_REASONS } from "@/lib/validation/work-status";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import type { MaintenanceRequest } from "@/types";

interface MaintenanceActionsMenuProps {
  request: MaintenanceRequest;
  onEdit: () => void;
}

/**
 * As ações rápidas de um pedido (secção 17 do pedido): para um pedido
 * aberto — Iniciar / À espera do cliente (+ motivo) / Bloquear / Concluir;
 * para um pedido concluído — só Reabrir. Editar está sempre disponível.
 * Mesmo padrão direto de `TaskActionsMenu`/`RenewalActionsMenu` — sem
 * dialog de confirmação, mutações diretas na `useMaintenanceStore`. Sair de
 * `waiting_on_client` (Iniciar/Bloquear/Concluir) limpa sempre
 * `waitingReason` — o invariante é reforçado em `applyMaintenanceRequestPatch`.
 */
export function MaintenanceActionsMenu({ request, onEdit }: MaintenanceActionsMenuProps) {
  const setRequestStatus = useMaintenanceStore((state) => state.setRequestStatus);
  const completeRequest = useMaintenanceStore((state) => state.completeRequest);
  const reopenRequest = useMaintenanceStore((state) => state.reopenRequest);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-0.5 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
        <ChevronDown className="h-4 w-4" />
        <span className="sr-only">Ações do pedido</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {request.status === "done" ? (
          <DropdownMenuItem onSelect={() => reopenRequest(request.id)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reabrir
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              disabled={request.status === "in_progress"}
              onSelect={() => setRequestStatus(request.id, "in_progress", null)}
            >
              <PlayCircle className="h-3.5 w-3.5" /> Iniciar
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>À espera do cliente</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {WAITING_REASONS.map((reason) => (
                    <DropdownMenuItem
                      key={reason}
                      onSelect={() => setRequestStatus(request.id, "waiting_on_client", reason)}
                    >
                      {waitingReasonLabel(reason)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuItem
              disabled={request.status === "blocked"}
              onSelect={() => setRequestStatus(request.id, "blocked", null)}
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Bloquear
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => completeRequest(request.id)}>
              <Check className="h-3.5 w-3.5" /> Concluir
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
