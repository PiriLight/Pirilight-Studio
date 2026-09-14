"use client";

import { Check, ChevronDown, Pencil, RotateCcw, XCircle } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRenewalStore } from "@/store/use-renewal-store";
import type { Renewal } from "@/types";

interface RenewalActionsMenuProps {
  renewal: Renewal;
  onEdit: () => void;
}

/**
 * As ações de uma linha: para `pending` — marcar como renovada ou cancelar;
 * para `renewed`/`cancelled` — reabrir como pendente; e sempre editar. Sem
 * dialog de confirmação (secção 16) — mesmo padrão direto do
 * `TaskActionsMenu` (Round 4). Nunca gera automaticamente a próxima
 * renovação recorrente: marcar como renovada só muda o registo atual.
 */
export function RenewalActionsMenu({ renewal, onEdit }: RenewalActionsMenuProps) {
  const markRenewed = useRenewalStore((state) => state.markRenewed);
  const cancelRenewal = useRenewalStore((state) => state.cancelRenewal);
  const reopenRenewal = useRenewalStore((state) => state.reopenRenewal);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-0.5 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
        <ChevronDown className="h-4 w-4" />
        <span className="sr-only">Ações da renovação</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {renewal.status === "pending" ? (
          <>
            <DropdownMenuItem onSelect={() => markRenewed(renewal.id)}>
              <Check className="h-3.5 w-3.5" /> Marcar como renovada
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => cancelRenewal(renewal.id)}>
              <XCircle className="h-3.5 w-3.5" /> Cancelar
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => reopenRenewal(renewal.id)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reabrir como pendente
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
