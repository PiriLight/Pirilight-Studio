"use client";

import { useEffect, useMemo } from "react";

import { NextActionTiming } from "@/components/domain/next-action-timing";
import { deriveNextAction } from "@/lib/data/business-overview";
import { buildTasksWithDetail } from "@/lib/data/task-board";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { useTaskStore } from "@/store/use-task-store";
import type { Business, Deal, LifecycleStatus, MaintenanceRequest, Project, Task } from "@/types";

interface NextActionStatProps {
  business: Business;
  projects: Project[];
  deals: Deal[];
  /** Snapshot GLOBAL do servidor — só para semear a `useMaintenanceStore` (Round 9). */
  initialMaintenanceRequests: MaintenanceRequest[];
  openDeal: Deal | null;
  lifecycleStatus: LifecycleStatus;
  /** Snapshot global do servidor — só para semear a `useTaskStore` se ainda não estiver inicializada. */
  initialTasks: Task[];
  today: string;
}

/**
 * O stat "Próxima ação" do cabeçalho do Business Detail — cliente porque
 * depende de Tasks e (Round 9) de MaintenanceRequests, ambas ao vivo.
 * Reaproveita `deriveNextAction` tal e qual (Round 3.1) — só troca a fonte
 * de Tasks/MaintenanceRequests do snapshot do servidor para as stores, para
 * refletir de imediato uma edição feita em `/tasks`, na tab Tarefas, ou num
 * pedido de manutenção deste negócio (`/maintenance` ou a tab Manutenção).
 */
export function NextActionStat({
  business,
  projects,
  deals,
  initialMaintenanceRequests,
  openDeal,
  lifecycleStatus,
  initialTasks,
  today,
}: NextActionStatProps) {
  const initialize = useTaskStore((state) => state.initialize);
  const allTasks = useTaskStore((state) => state.tasks);
  const initializeMaintenance = useMaintenanceStore((state) => state.initialize);
  const allMaintenanceRequests = useMaintenanceStore((state) => state.requests);

  useEffect(() => {
    initialize(initialTasks);
    initializeMaintenance(initialMaintenanceRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maintenanceRequests = useMemo(
    () => allMaintenanceRequests.filter((request) => request.businessId === business.id),
    [allMaintenanceRequests, business.id],
  );

  const businessTasks = useMemo(() => {
    const withDetail = buildTasksWithDetail(allTasks, {
      businesses: [business],
      projects,
      deals,
      maintenanceRequests,
    });
    return withDetail.filter((item) => item.businessId === business.id).map((item) => item.task);
  }, [allTasks, business, projects, deals, maintenanceRequests]);

  const nextAction = useMemo(
    () => deriveNextAction({ tasks: businessTasks, maintenanceRequests, openDeal, lifecycleStatus }, today),
    [businessTasks, maintenanceRequests, openDeal, lifecycleStatus, today],
  );

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Próxima ação</p>
      <p className="text-sm font-medium text-foreground">{nextAction.title}</p>
      {nextAction.source !== "none" && <NextActionTiming nextAction={nextAction} />}
    </div>
  );
}
