import { PageHeader } from "@/components/layout/page-header";
import { RenewalsBoard } from "@/components/renewals/renewals-board";
import { getBusinesses, getDeals, getProjects, getRenewalsBoard, getUsers } from "@/lib/data";
import { todayIso } from "@/lib/utils/date";

// Contadores, filtros e urgência dependem do dia de hoje — sem prerender estático.
export const dynamic = "force-dynamic";

export default async function RenewalsPage() {
  const now = new Date();
  const [rows, businesses, projects, deals, users] = await Promise.all([
    getRenewalsBoard(now),
    getBusinesses(now),
    getProjects(now),
    getDeals(now),
    getUsers(now),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Renovações"
        description="Domínios, alojamentos, subscrições e planos que precisam de ser renovados."
      />
      <RenewalsBoard
        initialRows={rows}
        businesses={businesses}
        projects={projects}
        deals={deals}
        users={users}
        today={todayIso(now)}
      />
    </div>
  );
}
