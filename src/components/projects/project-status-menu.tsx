"use client";

import { ChevronDown } from "lucide-react";

import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { WorkStatusBadge } from "@/components/domain/work-status-badge";
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
import { useProjectStore } from "@/store/use-project-store";
import type { Project } from "@/types";

const DIRECT_STATUSES = WORK_STATUSES.filter((status) => status !== "waiting_on_client");

/**
 * O pequeno controlo de "mudar estado" do Project (secção 13 do Round 5) —
 * um dropdown, não um formulário grande de Project. Mesmo padrão do submenu
 * "Mudar estado" do `TaskActionsMenu` (Round 4): "À espera do cliente" abre
 * um segundo submenu a pedir o motivo, nunca se entra nesse estado sem um.
 *
 * `project` já vem resolvido ao vivo por quem usa este componente (a
 * `useProjectStore`, quando já inicializada) — este componente só escreve.
 */
export function ProjectStatusMenu({ project }: { project: Project }) {
  const setProjectStatus = useProjectStore((state) => state.setProjectStatus);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-md hover:opacity-80">
          <WorkStatusBadge status={project.status} />
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {DIRECT_STATUSES.map((status) => (
            <DropdownMenuItem
              key={status}
              disabled={status === project.status}
              onSelect={() => setProjectStatus(project.id, status, null)}
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
                    onSelect={() => setProjectStatus(project.id, "waiting_on_client", reason)}
                  >
                    {waitingReasonLabel(reason)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      {project.waitingReason !== null && <WaitingReasonTag reason={project.waitingReason} />}
    </div>
  );
}
