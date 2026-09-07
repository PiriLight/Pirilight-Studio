import { PipelineBoard } from "@/components/commercial/pipeline-board";
import { PageHeader } from "@/components/layout/page-header";
import { getCommercialPipeline, getUsers } from "@/lib/data";
import { computeDealFollowUp } from "@/lib/data/business-overview";
import { isSupabaseCrmEnabled } from "@/lib/data/crm-mode";
import { loadCrmSnapshot } from "@/lib/data/supabase/crm";
import { todayIso } from "@/lib/utils/date";

// A urgência dos follow-ups depende do dia de hoje — nunca prerenderizar esta
// página em build-time, ou "hoje" fica congelado no dia do deploy.
export const dynamic = "force-dynamic";

export default async function CommercialPage() {
  const now = new Date();
  const crmEnabled = isSupabaseCrmEnabled();
  const snapshot = crmEnabled ? await loadCrmSnapshot() : null;
  const users = snapshot?.users ?? await getUsers(now);
  const cards = snapshot
    ? snapshot.deals.flatMap((deal) => {
        const business = snapshot.businesses.find((item) => item.id === deal.businessId);
        return business ? [{ deal, business, ...computeDealFollowUp(deal, todayIso(now)) }] : [];
      })
    : await getCommercialPipeline(now);
  const responsibleById = Object.fromEntries(users.map((user) => [user.id, user]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Comercial"
        description="Oportunidades comerciais e os próximos follow-ups."
      />
      <PipelineBoard
        cards={cards}
        responsibleById={responsibleById}
        today={todayIso(now)}
        crmEnabled={crmEnabled}
        businesses={snapshot?.businesses}
        contacts={snapshot?.contactRows}
        dealRows={snapshot?.dealRows}
      />
    </div>
  );
}
