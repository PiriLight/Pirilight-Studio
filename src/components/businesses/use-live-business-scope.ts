"use client";

import { useEffect, useMemo } from "react";

import { countActiveProjects, countOpenTasks } from "@/lib/data/business-overview";
import { taskBelongsToBusiness, type BusinessTaskScope } from "@/lib/data/task-board";
import { useProjectStore } from "@/store/use-project-store";
import { useTaskStore } from "@/store/use-task-store";
import type { Project, Task } from "@/types";

export interface LiveBusinessScopeInput extends BusinessTaskScope {
  /** Snapshots globais do servidor — só para semear as stores se ainda não estiverem inicializadas. */
  initialProjects: Project[];
  initialTasks: Task[];
}

export interface LiveBusinessScope {
  projects: Project[];
  tasks: Task[];
}

/**
 * Resolve, ao vivo, os Projects e as Tasks de um negócio — nunca a partir de
 * uma lista de ids pré-calculada (que "congela" e nunca vê algo criado
 * depois), mas resolvendo estruturalmente contra `useProjectStore`/
 * `useTaskStore` a cada mudança (Round 5.1: corrige o problema dos `taskIds`
 * congelados de `LiveOverallStatusBadge`).
 *
 * Reaproveitado por `LiveOverallStatusBadge` e pelos contadores ao vivo de
 * Clientes (`LiveBusinessCounts`) — os dois lêem o mesmo scope, para nunca
 * haver duas versões divergentes de "que Tasks pertencem a este negócio".
 */
export function useLiveBusinessScope(input: LiveBusinessScopeInput): LiveBusinessScope {
  const { businessId, projectIds, dealIds, maintenanceRequestIds, initialProjects, initialTasks } = input;

  const initializeProjects = useProjectStore((state) => state.initialize);
  const projects = useProjectStore((state) => state.projects);
  const initializeTasks = useTaskStore((state) => state.initialize);
  const allTasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    initializeProjects(initialProjects);
    initializeTasks(initialTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => {
    const scopedProjects = projects.filter((p) => projectIds.includes(p.id));
    const scopedTasks = allTasks.filter((t) =>
      taskBelongsToBusiness(t, { businessId, projectIds, dealIds, maintenanceRequestIds }),
    );
    return { projects: scopedProjects, tasks: scopedTasks };
  }, [projects, allTasks, businessId, projectIds, dealIds, maintenanceRequestIds]);
}

export interface LiveBusinessCounts {
  activeProjectsCount: number;
  openTasksCount: number;
}

/**
 * `activeProjectsCount`/`openTasksCount` de Clientes, ao vivo — mesma
 * `useLiveBusinessScope` de cima, mais as contagens puras já reaproveitadas
 * pelo `getBusinessSummary` do servidor (`countActiveProjects`/
 * `countOpenTasks`), para nunca haver duas versões da mesma regra.
 */
export function useLiveBusinessCounts(input: LiveBusinessScopeInput): LiveBusinessCounts {
  const { projects, tasks } = useLiveBusinessScope(input);

  return useMemo(
    () => ({ activeProjectsCount: countActiveProjects(projects), openTasksCount: countOpenTasks(tasks) }),
    [projects, tasks],
  );
}
