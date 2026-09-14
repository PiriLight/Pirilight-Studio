import { PageHeader } from "@/components/layout/page-header";
import { ProjectsBoard } from "@/components/projects/projects-board";
import { getPiriCardsBoard, getProjects, getRenewals, getTasks, getUsers } from "@/lib/data";
import { todayIso } from "@/lib/utils/date";

// Pagamentos e renovações dependem do dia de hoje — sem prerender estático.
export const dynamic = "force-dynamic";

export default async function PiriCardsPage() {
  const now = new Date();
  const [rows, projects, tasks, users, renewals] = await Promise.all([
    getPiriCardsBoard(now),
    getProjects(now),
    getTasks(now),
    getUsers(now),
    getRenewals(now),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="PiriCards" description="Os projetos PiriCard, do design à entrega." />
      <ProjectsBoard
        type="piricard"
        initialRows={rows}
        initialProjects={projects}
        initialTasks={tasks}
        initialRenewals={renewals}
        users={users}
        today={todayIso(now)}
      />
    </div>
  );
}
