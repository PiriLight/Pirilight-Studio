import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyProjectStatusPatch } from "@/lib/data/project-overview";
import type { ProjectStatusPatch } from "@/lib/data/project-overview";
import type { Project, WaitingReason, WorkStatus } from "@/types";

/**
 * A mesma filosofia exata de `useTaskStore` (Round 4), aplicada a Project: uma
 * cópia local mutável, persistida em localStorage, que semeia a partir do
 * snapshot do servidor **só uma vez** (`initialized === false`). Só existe
 * porque há uma mutação real a justificá-la (mudar `status`/`waitingReason`
 * do Project no Website/PiriCard Detail, secção 13 do Round 5) — nada de
 * `responsibleUserId` aqui (D3: reaproveita o responsável do Business, nunca
 * um campo próprio de Project).
 *
 * Toda a validação/invariante vive em `applyProjectStatusPatch`
 * (`lib/data/project-overview.ts`) — esta store só chama e faz `set()`.
 */
interface ProjectState {
  projects: Project[];
  initialized: boolean;
  initialize: (projects: Project[]) => void;
  setProjectStatus: (id: string, status: WorkStatus, waitingReason: WaitingReason | null) => void;
}

function replaceProject(projects: Project[], id: string, next: Project): Project[] {
  return projects.map((project) => (project.id === id ? next : project));
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      initialized: false,

      initialize: (projects) => {
        if (get().initialized) return;
        set({ projects, initialized: true });
      },

      setProjectStatus: (id, status, waitingReason) => {
        const current = get().projects.find((project) => project.id === id);
        if (current === undefined) return;
        const patch: ProjectStatusPatch = { status, waitingReason };
        set((state) => ({ projects: replaceProject(state.projects, id, applyProjectStatusPatch(current, patch)) }));
      },
    }),
    { name: "pirilight-projects" },
  ),
);
