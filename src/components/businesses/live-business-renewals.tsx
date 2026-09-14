"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { RenewalDueLabel } from "@/components/renewals/renewal-due-label";
import { RenewalStatusBadge } from "@/components/renewals/renewal-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { renewalTypeLabel } from "@/lib/constants/labels";
import { projectDetailHref } from "@/lib/data/project-overview";
import { formatEuros } from "@/lib/utils/format";
import { useRenewalStore } from "@/store/use-renewal-store";
import type { Project, Renewal } from "@/types";

interface LiveBusinessRenewalsProps {
  /** Projects deste negócio (estáticos — nome/tipo não mudam). */
  projects: Project[];
  /** Snapshot global do servidor — só para semear a `useRenewalStore` se ainda não estiver inicializada. */
  initialRenewals: Renewal[];
  today: string;
}

/**
 * A tab "Renovações" do Business Detail Hub — agora ao vivo (Round 6): lê a
 * mesma `useRenewalStore` de `/renewals`, filtrada pelos Projects deste
 * negócio, para uma Renewal editada/renovada/cancelada/reaberta noutro sítio
 * aparecer aqui de imediato. Só leitura — criar/editar vive em `/renewals`
 * e no Website/PiriCard Detail (secção 20: "não criar um segundo sistema
 * visual de Renovações" — reaproveita `RenewalStatusBadge`/`RenewalDueLabel`
 * tal e qual).
 */
export function LiveBusinessRenewals({ projects, initialRenewals, today }: LiveBusinessRenewalsProps) {
  const initialize = useRenewalStore((state) => state.initialize);
  const allRenewals = useRenewalStore((state) => state.renewals);

  useEffect(() => {
    initialize(initialRenewals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);

  const renewals = useMemo(
    () =>
      allRenewals
        .filter((renewal) => projectIds.includes(renewal.projectId))
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0)),
    [allRenewals, projectIds],
  );

  if (renewals.length === 0) {
    return (
      <EmptyState
        title="Sem renovações"
        description="Nenhum dos projetos deste negócio tem renovações registadas."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {renewals.map((renewal) => {
        const project = projectById.get(renewal.projectId);
        return (
          <Card key={renewal.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{renewalTypeLabel(renewal.type)}</p>
                {project && (
                  <Link
                    href={projectDetailHref(project)}
                    className="text-xs text-muted-foreground hover:text-info hover:underline"
                  >
                    {project.name}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{formatEuros(renewal.amount)}</span>
                <RenewalDueLabel dueDate={renewal.dueDate} today={today} status={renewal.status} />
                <RenewalStatusBadge status={renewal.status} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
