import { MaintenanceBoard } from "@/components/maintenance/maintenance-board";
import { NewMaintenanceButton } from "@/components/maintenance/new-maintenance-button";
import { PageHeader } from "@/components/layout/page-header";
import { getBusinesses, getMaintenanceBoard, getProjects, getUsers } from "@/lib/data";
import { todayIso } from "@/lib/utils/date";

// A classificação temporal (Em atraso/Hoje/Próximos 7 dias) depende do dia de hoje — sem prerender estático.
export const dynamic = "force-dynamic";

/**
 * `/maintenance` — Round 9. Deixa de ser o placeholder "Em breve" da Phase
 * 1B: Manutenção passa a módulo operacional completo, sincronizado ao vivo
 * com o Dashboard, o Business Detail e o Website/PiriCard Detail via
 * `useMaintenanceStore`.
 */
export default async function MaintenancePage() {
  const now = new Date();
  const [rows, projects, businesses, users] = await Promise.all([
    getMaintenanceBoard(now),
    getProjects(now),
    getBusinesses(now),
    getUsers(now),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manutenção"
        description="Pedidos de alteração e manutenção dos projetos entregues."
        action={
          <NewMaintenanceButton projects={projects} businesses={businesses} users={users} today={todayIso(now)} />
        }
      />
      <MaintenanceBoard initialRows={rows} projects={projects} businesses={businesses} users={users} today={todayIso(now)} />
    </div>
  );
}
