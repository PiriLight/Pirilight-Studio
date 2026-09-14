"use client";

import { Check, ChevronDown, Pencil, RotateCcw } from "lucide-react";

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
import { waitingReasonLabel, workStatusLabel } from "@/lib/constants/labels";
import { WAITING_REASONS, WORK_STATUSES } from "@/lib/validation/work-status";
import { useTaskStore } from "@/store/use-task-store";
import type { Task } from "@/types";

const DIRECT_STATUSES = WORK_STATUSES.filter((status) => status !== "waiting_on_client");

interface TaskActionsMenuProps {
  task: Task;
  onEdit: () => void;
}

/**
 * As três ações rápidas de uma linha: concluir/reabrir (um clique), mudar
 * estado (submenu — "À espera do cliente" abre um segundo submenu a pedir o
 * motivo, nunca se entra nesse estado sem um), e editar (abre o
 * `TaskFormDialog` completo). Mesmo padrão do "mudar stage" do board
 * Comercial (Round 3): trigger simples + `DropdownMenu`, sem estado próprio —
 * as mutações vão direto para `useTaskStore`.
 */
export function TaskActionsMenu({ task, onEdit }: TaskActionsMenuProps) {
  const setTaskStatus = useTaskStore((state) => state.setTaskStatus);
  const completeTask = useTaskStore((state) => state.completeTask);
  const reopenTask = useTaskStore((state) => state.reopenTask);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-0.5 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
        <ChevronDown className="h-4 w-4" />
        <span className="sr-only">Ações da tarefa</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {task.status === "done" ? (
          <DropdownMenuItem onSelect={() => reopenTask(task.id)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reabrir
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => completeTask(task.id)}>
            <Check className="h-3.5 w-3.5" /> Marcar como concluída
          </DropdownMenuItem>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Mudar estado</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {DIRECT_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  disabled={status === task.status}
                  onSelect={() => setTaskStatus(task.id, status, null)}
                >
                  {workStatusLabel(status)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>{workStatusLabel("waiting_on_client")}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {WAITING_REASONS.map((reason) => (
                      <DropdownMenuItem
                        key={reason}
                        onSelect={() => setTaskStatus(task.id, "waiting_on_client", reason)}
                      >
                        {waitingReasonLabel(reason)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
