"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ProjectSummaryCard } from "@/components/businesses/project-summary-card";
import { EmptyState } from "@/components/ui/empty-state";
import { projectDetailHref } from "@/lib/data/project-overview";
import { useProjectStore } from "@/store/use-project-store";
import type { Project, ProjectWithDetail } from "@/types";

interface LiveProjectsTabProps {
  projects: ProjectWithDetail[];
  /** Snapshot global do servidor — só para semear a `useProjectStore` se ainda não estiver inicializada. */
  initialProjects: Project[];
}

/**
 * A aba "Projetos" do Business Detail Hub — substitui a antiga `ProjectsTab`
 * estática: cada cartão passa a apontar para o Website/PiriCard Detail
 * (secção 14 do Round 5) e reflete ao vivo uma mudança de estado feita lá,
 * lendo a mesma `useProjectStore` do Round 5. Website/PiriCard/pagamento
 * continuam estáticos aqui (não editáveis nesta fase) — só `project` é lido
 * ao vivo.
 */
export function LiveProjectsTab({ projects, initialProjects }: LiveProjectsTabProps) {
  const initialize = useProjectStore((state) => state.initialize);
  const liveProjects = useProjectStore((state) => state.projects);

  useEffect(() => {
    initialize(initialProjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (projects.length === 0) {
    return (
      <EmptyState title="Sem projetos" description="Ainda não há Websites ou PiriCards associados a este negócio." />
    );
  }

  const liveProjectById = new Map(liveProjects.map((project) => [project.id, project]));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((item) => {
        const liveProject = liveProjectById.get(item.project.id) ?? item.project;
        return (
          <Link
            key={item.project.id}
            href={projectDetailHref(liveProject)}
            className="block transition-opacity hover:opacity-90"
          >
            <ProjectSummaryCard item={{ ...item, project: liveProject }} />
          </Link>
        );
      })}
    </div>
  );
}
