import { NewTaskButton } from "@/components/tasks/new-task-button";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { PageHeader } from "@/components/layout/page-header";
import {
  getBusinesses,
  getDeals,
  getMaintenanceRequests,
  getProjects,
  getTasks,
  getUsers,
} from "@/lib/data";
import { todayIso } from "@/lib/utils/date";

// A urgência das tarefas depende do dia de hoje — nunca prerenderizar esta
// página em build-time, ou "hoje" fica congelado no dia do deploy.
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const now = new Date();
  const [tasks, users, businesses, projects, deals, maintenanceRequests] = await Promise.all([
    getTasks(now),
    getUsers(now),
    getBusinesses(now),
    getProjects(now),
    getDeals(now),
    getMaintenanceRequests(now),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tarefas"
        description="Tudo o que precisa de ser feito, por ordem de prioridade."
        action={<NewTaskButton businesses={businesses} projects={projects} users={users} />}
      />
      <TasksBoard
        initialTasks={tasks}
        users={users}
        businesses={businesses}
        projects={projects}
        deals={deals}
        maintenanceRequests={maintenanceRequests}
        today={todayIso(now)}
      />
    </div>
  );
}
