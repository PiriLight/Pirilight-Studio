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
import { isSupabaseCrmEnabled } from "@/lib/data/crm-mode";
import { loadCrmSnapshot } from "@/lib/data/supabase/crm";
import { diffCalendarDays, todayIso } from "@/lib/utils/date";

// Renovações e pagamentos dependem do dia de hoje — sem prerender estático.
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const now = new Date();
  const crmEnabled = isSupabaseCrmEnabled();
  const snapshot = crmEnabled ? await loadCrmSnapshot() : null;
  const businesses = snapshot
    ? snapshot.businesses.filter((business) => business.lifecycleStatus === "client")
    : await getClientBusinesses(now);
  const [mockSummaries, mockUsers, allProjects, allTasks, allRenewals, allMaintenanceRequests] = await Promise.all([
    snapshot ? Promise.resolve([]) : getBusinessSummaries(businesses, now),
    snapshot ? Promise.resolve([]) : getUsers(now),
    getProjects(now),
    getTasks(now),
    getRenewals(now),
    getMaintenanceRequests(now),
  ]);

  const summaries = snapshot
    ? businesses.map((business) => {
        const businessDeals = snapshot.deals.filter((deal) => deal.businessId === business.id);
        const responsibleUserId = [...businessDeals]
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]?.responsibleUserId ?? null;
        return {
          business,
          activeProjectsCount: 0,
          hasWebsite: false,
          hasPiriCard: false,
          overallStatus: "none" as const,
          paymentSummary: { totalValue: 0, amountReceived: 0, remainingValue: 0, hasOverdue: false, hasPayments: false },
          nextRenewal: null,
          openTasksCount: 0,
          responsibleUserId,
        };
      })
    : mockSummaries;
  const users = snapshot?.users ?? mockUsers;

  const nameByUserId = new Map(users.map((user) => [user.id, user.name]));
  const today = todayIso(now);

  const rows: ClientListRow[] = await Promise.all(
    summaries.map(async (summary) => {
      const [projects, deals, maintenanceRequests] = snapshot
        ? [[], snapshot.deals.filter((deal) => deal.businessId === summary.business.id), []]
        : await Promise.all([
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
        crmEnabled={crmEnabled}
      />
    </div>
  );
}
