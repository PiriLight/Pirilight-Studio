import { DashboardBoard } from "@/components/dashboard/dashboard-board";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { PageHeader } from "@/components/layout/page-header";
import {
  getBusinesses,
  getDeals,
  getGoals,
  getMaintenanceRequests,
  getPayments,
  getProjects,
  getRenewals,
  getTasks,
  getUsers,
} from "@/lib/data";
import { todayIso } from "@/lib/utils/date";
import { formatDateDisplay } from "@/lib/utils/format";

// A urgência de tudo o que aparece aqui depende do dia de hoje — sem prerender estático.
export const dynamic = "force-dynamic";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-PT", { weekday: "long" });

/**
 * Dashboard — versão real (Round 7; Objetivos ligado a `useGoalStore` no
 * Round 8; Manutenção ligada a `useMaintenanceStore` no Round 9).
 *
 * Mesma estrutura de secções do placeholder (Round 1, plano secção 8), agora
 * alimentada por `attention-rules.ts` (Round 2, sem alterações) sobre dados
 * ao vivo: Business/Deal/Payment/User são só de leitura nesta fase (sem
 * store própria) e vêm direto do servidor; Task/Project/Renewal/Goal/
 * MaintenanceRequest semeiam as mesmas stores já usadas em `/tasks`,
 * `/websites`, `/piricards`, `/renewals`, `/goals` e `/maintenance` — o
 * `DashboardBoard` (cliente) faz toda a agregação/apresentação.
 */
export default async function DashboardPage() {
  const now = new Date();
  const today = todayIso(now);
  const [businesses, deals, projects, tasks, renewals, payments, maintenanceRequests, goals, users] =
    await Promise.all([
      getBusinesses(now),
      getDeals(now),
      getProjects(now),
      getTasks(now),
      getRenewals(now),
      getPayments(now),
      getMaintenanceRequests(now),
      getGoals(now),
      getUsers(now),
    ]);

  const weekday = capitalize(WEEKDAY_FORMATTER.format(new Date(`${today}T12:00:00Z`)));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={<DashboardGreeting />}
        description={`${weekday}, ${formatDateDisplay(today)} — aqui está o que precisa da tua atenção.`}
      />

      <DashboardBoard
        businesses={businesses}
        deals={deals}
        payments={payments}
        users={users}
        initialTasks={tasks}
        initialProjects={projects}
        initialRenewals={renewals}
        initialGoals={goals}
        initialMaintenanceRequests={maintenanceRequests}
        today={today}
      />
    </div>
  );
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}
