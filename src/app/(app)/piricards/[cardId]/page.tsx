import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { PaymentProgress } from "@/components/domain/payment-progress";
import { PiriCardProductionInfo } from "@/components/projects/piricard-production-info";
import { ProjectDetailHeader } from "@/components/projects/project-detail-header";
import { ProjectMaintenanceSection } from "@/components/projects/project-maintenance-section";
import { ProjectRenewalsList } from "@/components/projects/project-renewals-list";
import { ProjectTasksSection } from "@/components/projects/project-tasks-section";
import { getMaintenanceRequests, getProjectOverview, getProjects, getRenewals, getTasks, getUsers } from "@/lib/data";
import { todayIso } from "@/lib/utils/date";

// Pagamento, renovação e próxima ação dependem do dia de hoje — sem prerender estático.
export const dynamic = "force-dynamic";

interface PiriCardDetailPageProps {
  // O id na URL é o `Project.id` — PiriCard não tem `id` próprio, só `projectId`.
  params: Promise<{ cardId: string }>;
}

export default async function PiriCardDetailPage({ params }: PiriCardDetailPageProps) {
  const { cardId } = await params;
  const now = new Date();
  const overview = await getProjectOverview(cardId, now);
  if (overview === null || overview.project.type !== "piricard" || overview.piriCard === null) {
    notFound();
  }

  const [projects, tasks, users, renewals, maintenanceRequests] = await Promise.all([
    getProjects(now),
    getTasks(now),
    getUsers(now),
    getRenewals(now),
    getMaintenanceRequests(now),
  ]);
  const userById = new Map(users.map((user) => [user.id, user]));
  const today = todayIso(now);

  return (
    <div className="flex flex-col gap-6">
      <ProjectDetailHeader
        project={overview.project}
        business={overview.business}
        initialMaintenanceRequests={maintenanceRequests}
        initialProjects={projects}
        initialTasks={tasks}
        today={today}
      />

      <ProjectTasksSection
        business={overview.business}
        project={overview.project}
        maintenanceRequests={overview.maintenanceRequests}
        users={users}
        userById={userById}
        initialTasks={tasks}
        today={today}
      />

      <SectionCard title="Pagamento">
        <PaymentProgress summary={overview.paymentSummary} />
      </SectionCard>

      <ProjectRenewalsList
        business={overview.business}
        project={overview.project}
        initialRenewals={renewals}
        today={today}
      />

      <ProjectMaintenanceSection
        business={overview.business}
        project={overview.project}
        users={users}
        initialMaintenanceRequests={maintenanceRequests}
        today={today}
      />

      <SectionCard title="Produção PiriCard">
        <PiriCardProductionInfo piriCard={overview.piriCard} />
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
