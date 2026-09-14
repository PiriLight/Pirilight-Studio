import Link from "next/link";
import { CreditCard, Globe } from "lucide-react";

import type { ClientListRow } from "@/components/businesses/client-list-row";
import { LiveOverallStatusBadge } from "@/components/businesses/live-overall-status-badge";
import { useLiveBusinessCounts } from "@/components/businesses/use-live-business-scope";
import { PaymentProgress } from "@/components/domain/payment-progress";
import { Card } from "@/components/ui/card";
import { formatDateDisplay } from "@/lib/utils/format";
import { renewalTypeLabel } from "@/lib/constants/labels";
import { cn } from "@/lib/utils";
import type { MaintenanceRequest, Project, Task } from "@/types";

interface BusinessCardProps {
  row: ClientListRow;
  /** Snapshots globais do servidor — repassados ao `LiveOverallStatusBadge`/`useLiveBusinessCounts` (D7). */
  initialProjects: Project[];
  initialTasks: Task[];
  /** Snapshot GLOBAL do servidor — só para semear a `useMaintenanceStore` (Round 9). */
  initialMaintenanceRequests: MaintenanceRequest[];
}

/** Cartão de negócio — a vista mobile da lista de Clientes (a tabela vira isto abaixo de `md`). */
export function BusinessCard({ row, initialProjects, initialTasks, initialMaintenanceRequests }: BusinessCardProps) {
  const { summary, responsibleName } = row;
  const { business, nextRenewal } = summary;

  const { activeProjectsCount, openTasksCount } = useLiveBusinessCounts({
    businessId: row.businessId,
    projectIds: row.projectIds,
    dealIds: row.dealIds,
    maintenanceRequestIds: row.maintenanceRequests.map((m) => m.id),
    initialProjects,
    initialTasks,
  });

  return (
    <Card className="p-4">
      <Link href={`/businesses/${business.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground hover:text-info hover:underline">
              {business.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{business.industry}</p>
          </div>
          <LiveOverallStatusBadge
            businessId={row.businessId}
            projectIds={row.projectIds}
            dealIds={row.dealIds}
            initialMaintenanceRequests={initialMaintenanceRequests}
            initialProjects={initialProjects}
            initialTasks={initialTasks}
          />
        </div>
      </Link>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className={cn("flex items-center gap-1", summary.hasWebsite && "text-info")}>
          <Globe className="h-3.5 w-3.5" /> {summary.hasWebsite ? "Website" : "—"}
        </span>
        <span className={cn("flex items-center gap-1", summary.hasPiriCard && "text-info")}>
          <CreditCard className="h-3.5 w-3.5" /> {summary.hasPiriCard ? "PiriCard" : "—"}
        </span>
        <span>
          {activeProjectsCount} projeto{activeProjectsCount === 1 ? "" : "s"} ativo
          {activeProjectsCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3">
        <PaymentProgress summary={summary.paymentSummary} compact />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {nextRenewal
            ? `${renewalTypeLabel(nextRenewal.type)} — ${formatDateDisplay(nextRenewal.dueDate)}`
            : "Sem renovações agendadas"}
        </span>
        <span>
          {openTasksCount} tarefa{openTasksCount === 1 ? "" : "s"}
        </span>
      </div>

      {responsibleName && (
        <p className="mt-2 text-xs text-muted-foreground">Responsável: {responsibleName}</p>
      )}
    </Card>
  );
}
