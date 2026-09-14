import { GoalsBoard } from "@/components/goals/goals-board";
import { NewGoalButton } from "@/components/goals/new-goal-button";
import { PageHeader } from "@/components/layout/page-header";
import { getGoals, getTasks, getUsers } from "@/lib/data";
import { todayIso } from "@/lib/utils/date";

// O estado derivado (Em curso/Concluído) e o "Próximo passo" das Tasks ligadas
// dependem do dia de hoje — sem prerender estático (mesmo padrão de Tasks/Renovações).
export const dynamic = "force-dynamic";

/**
 * `/goals` — Round 8. Deixa de ser o placeholder "Em breve" da Phase 1B:
 * Objetivos passa a módulo funcional, com progresso manual (nunca calculado
 * a partir das Tasks ligadas) e sincronizado ao vivo com o Dashboard via
 * `useGoalStore`.
 */
export default async function GoalsPage() {
  const now = new Date();
  const [goals, tasks, users] = await Promise.all([getGoals(now), getTasks(now), getUsers(now)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Objetivos"
        description="Metas da PiriLight Studio e da PiriCard, com progresso e próximas ações."
        action={<NewGoalButton users={users} initialTasks={tasks} />}
      />
      <GoalsBoard initialGoals={goals} initialTasks={tasks} users={users} today={todayIso(now)} />
    </div>
  );
}
