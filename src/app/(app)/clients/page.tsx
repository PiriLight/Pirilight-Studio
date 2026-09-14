import type { ClientListRow } from "@/components/businesses/client-list-row";
import { ClientsBoard } from "@/components/businesses/clients-board";
import { PageHeader } from "@/components/layout/page-header";
import {
  RENEWALS_PANEL_WINDOW_DAYS,
  getBusinessSummaries,
  getClientBusinesses,
  getDealsByBusinessId,
  getMaintenanceRequests,
  getMaintenanceRequestsByBusinessId,
  getProjects,
  getProjectsByBusinessId,
  getRenewals,
  getTasks,
  getUsers,
} from "@/lib/data";
import { diffCalendarDays, todayIso } from "@/lib/utils/date";

// Renovações e pagamentos dependem do dia de hoje — sem prerender estático.
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const now = new Date();
  const businesses = await getClientBusinesses(now);
  const [summaries, users, allProjects, allTasks, allRenewals, allMaintenanceRequests] = await Promise.all([
    getBusinessSummaries(businesses, now),
    getUsers(now),
    getProjects(now),
    getTasks(now),
    getRenewals(now),
    getMaintenanceRequests(now),
  ]);

  const nameByUserId = new Map(users.map((user) => [user.id, user.name]));
  const today = todayIso(now);

  const rows: ClientListRow[] = await Promise.all(
    summaries.map(async (summary) => {
      const [projects, deals, maintenanceRequests] = await Promise.all([
        getProjectsByBusinessId(summary.business.id, now),
        getDealsByBusinessId(summary.business.id, now),
        getMaintenanceRequestsByBusinessId(summary.business.id, now),
      ]);

      return {
        summary,
        responsibleName: summary.responsibleUserId
          ? (nameByUserId.get(summary.responsibleUserId) ?? null)
          : null,
        hasPendingPayment: summary.paymentSummary.remainingValue > 0,
        hasUpcomingRenewal:
          summary.nextRenewal !== null &&
          diffCalendarDays(summary.nextRenewal.dueDate, today) <= RENEWALS_PANEL_WINDOW_DAYS,
        businessId: summary.business.id,
        projectIds: projects.map((p) => p.id),
        dealIds: deals.map((d) => d.id),
        maintenanceRequests,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description="Clientes, projetos, pagamentos e renovações num só lugar."
      />
      <ClientsBoard
        rows={rows}
        initialProjects={allProjects}
        initialTasks={allTasks}
        initialRenewals={allRenewals}
        initialMaintenanceRequests={allMaintenanceRequests}
        today={today}
      />
    </div>
  );
}
