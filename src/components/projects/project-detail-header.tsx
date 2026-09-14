"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { NextActionTiming } from "@/components/domain/next-action-timing";
import { ProjectStatusMenu } from "@/components/projects/project-status-menu";
import { deriveNextAction } from "@/lib/data/business-overview";
import { buildTasksWithDetail } from "@/lib/data/task-board";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { useProjectStore } from "@/store/use-project-store";
import { useTaskStore } from "@/store/use-task-store";
import type { Business, MaintenanceRequest, Project, Task } from "@/types";

interface ProjectDetailHeaderProps {
  project: Project;
  business: Business;
  /** Snapshot GLOBAL do servidor — só para semear a `useMaintenanceStore` (Round 9). */
  initialMaintenanceRequests: MaintenanceRequest[];
  /** Snapshots globais do servidor — só para semear as stores se ainda não estiverem inicializadas. */
  initialProjects: Project[];
  initialTasks: Task[];
  today: string;
}

/**
 * Cabeçalho do Website/PiriCard Detail: nome, Business (link), estado (com o
 * menu de mudança, `ProjectStatusMenu`) e próxima ação — a mesma
 * `deriveNextAction` do Business Detail (Round 3.1), só que sem candidato de
 * Deal (D2 do Round 5: um Project não tem Deal nem lifecycle próprios).
 *
 * Fica inteiro no cliente (como `NextActionStat`/`BusinessTasksTab` do Round
 * 4) porque tanto o estado como a próxima ação têm de reagir de imediato a
 * mudanças feitas aqui mesmo ou em `/tasks`.
 */
export function ProjectDetailHeader({
  project,
  business,
  initialMaintenanceRequests,
  initialProjects,
  initialTasks,
  today,
}: ProjectDetailHeaderProps) {
  const initializeProjects = useProjectStore((state) => state.initialize);
  const projects = useProjectStore((state) => state.projects);
  const initializeTasks = useTaskStore((state) => state.initialize);
  const allTasks = useTaskStore((state) => state.tasks);
  const initializeMaintenance = useMaintenanceStore((state) => state.initialize);
  const allMaintenanceRequests = useMaintenanceStore((state) => state.requests);

  useEffect(() => {
    initializeProjects(initialProjects);
    initializeTasks(initialTasks);
    initializeMaintenance(initialMaintenanceRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveProject = projects.find((p) => p.id === project.id) ?? project;

  const maintenanceRequests = useMemo(
    () => allMaintenanceRequests.filter((request) => request.projectId === project.id),
    [allMaintenanceRequests, project.id],
  );

  const tasksForProject = useMemo(() => {
    const withDetail = buildTasksWithDetail(allTasks, {
      businesses: [business],
      projects: [project],
      deals: [],
      maintenanceRequests,
    });
    return withDetail.filter((item) => item.projectId === project.id).map((item) => item.task);
  }, [allTasks, business, project, maintenanceRequests]);

  const nextAction = useMemo(
    () => deriveNextAction({ tasks: tasksForProject, maintenanceRequests }, today),
    [tasksForProject, maintenanceRequests, today],
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <Link
          href={`/businesses/${business.id}`}
          className="text-xs text-muted-foreground hover:text-info hover:underline"
        >
          {business.name}
        </Link>
        <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
        <ProjectStatusMenu project={liveProject} />
      </div>

      <div className="flex flex-col gap-0.5 sm:items-end">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Próxima ação</p>
        <p className="text-sm font-medium text-foreground">{nextAction.title}</p>
        {nextAction.source !== "none" && <NextActionTiming nextAction={nextAction} />}
      </div>
    </div>
  );
}
