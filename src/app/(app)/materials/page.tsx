import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default function MaterialsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Materiais"
        description="Materiais comerciais internos e ideias em backlog — incluindo o vídeo profissional do PiriCard."
        action={<Badge variant="muted">Em breve</Badge>}
      />
      <EmptyState title="Em breve" description="Phase 1B — sem prioridade nesta ronda." />
    </div>
  );
}
