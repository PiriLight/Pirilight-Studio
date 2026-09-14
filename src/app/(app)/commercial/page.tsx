import { PipelineBoard } from "@/components/commercial/pipeline-board";
import { PageHeader } from "@/components/layout/page-header";
import { getCommercialPipeline, getUsers } from "@/lib/data";
import { todayIso } from "@/lib/utils/date";

// A urgência dos follow-ups depende do dia de hoje — nunca prerenderizar esta
// página em build-time, ou "hoje" fica congelado no dia do deploy.
export const dynamic = "force-dynamic";

export default async function CommercialPage() {
  const now = new Date();
  const [cards, users] = await Promise.all([getCommercialPipeline(now), getUsers(now)]);
  const responsibleById = Object.fromEntries(users.map((user) => [user.id, user]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comercial"
        description="Oportunidades comerciais e os próximos follow-ups."
      />
      <PipelineBoard cards={cards} responsibleById={responsibleById} today={todayIso(now)} />
    </div>
  );
}
