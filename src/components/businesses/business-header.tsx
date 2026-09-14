import type { ReactNode } from "react";

import { LiveOverallStatusBadge } from "@/components/businesses/live-overall-status-badge";
import { NextActionStat } from "@/components/businesses/next-action-stat";
import { LifecycleStatusBadge } from "@/components/domain/lifecycle-status-badge";
import type { BusinessOverview, MaintenanceRequest, Project, Task, User } from "@/types";

function HeaderStat({ label, value, extra }: { label: string; value: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
      {extra}
    </div>
  );
}

/**
 * Cabeçalho do Business Detail Hub — a primeira coisa que o Sny ou o Bino
 * veem ao abrir um negócio: quem é, em que estado está, e o que fazer a
 * seguir. Tudo o resto (as abas) é detalhe de apoio a isto.
 */
export function BusinessHeader({
  overview,
  responsible,
  allTasks,
  allProjects,
  allMaintenanceRequests,
  today,
}: {
  overview: BusinessOverview;
  responsible: User | undefined;
  /** Snapshot global do servidor — só para semear a `useTaskStore`, ver `NextActionStat`. */
  allTasks: Task[];
  /** Snapshot global do servidor — só para semear a `useProjectStore`, ver `LiveOverallStatusBadge`. */
  allProjects: Project[];
  /** Snapshot global do servidor — só para semear a `useMaintenanceStore` (Round 9). */
  allMaintenanceRequests: MaintenanceRequest[];
  today: string;
}) {
  const { business, primaryContact } = overview;
  const projectIds = overview.projects.map((item) => item.project.id);
  const dealIds = overview.deals.map((deal) => deal.id);

  return (
    <div className="flex flex-col gap-5 border-b border-border pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{business.name}</h1>
            <LifecycleStatusBadge status={business.lifecycleStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            {business.industry} · {business.location}
          </p>
        </div>
        <LiveOverallStatusBadge
          businessId={business.id}
          projectIds={projectIds}
          dealIds={dealIds}
          initialMaintenanceRequests={allMaintenanceRequests}
          initialProjects={allProjects}
          initialTasks={allTasks}
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <HeaderStat
          label="Contacto principal"
          value={primaryContact ? `${primaryContact.name} · ${primaryContact.role}` : "—"}
        />
        <HeaderStat label="Responsável" value={responsible?.name ?? "—"} />
        <NextActionStat
          business={business}
          projects={overview.projects.map((item) => item.project)}
          deals={overview.deals}
          initialMaintenanceRequests={allMaintenanceRequests}
          openDeal={overview.openDeal}
          lifecycleStatus={business.lifecycleStatus}
          initialTasks={allTasks}
          today={today}
        />
      </div>
    </div>
  );
}
