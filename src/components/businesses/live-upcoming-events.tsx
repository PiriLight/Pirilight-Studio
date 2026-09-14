"use client";

import { useEffect, useMemo } from "react";

import { buildRenewalEvents } from "@/lib/data/renewal-board";
import { formatDateDisplay } from "@/lib/utils/format";
import { useRenewalStore } from "@/store/use-renewal-store";
import type { Renewal } from "@/types";

interface UpcomingEvent {
  date: string;
  text: string;
}

interface LiveUpcomingEventsProps {
  /** Eventos de Deal/Task — já filtrados/ordenados a partir de hoje, mas ainda não cortados ao top N. */
  staticEvents: UpcomingEvent[];
  /** Ids estruturais dos Projects deste negócio (estáveis — nunca mudam de Business). */
  projectIds: string[];
  /** Snapshot global do servidor — só para semear a `useRenewalStore` se ainda não estiver inicializada. */
  initialRenewals: Renewal[];
  today: string;
}

/**
 * "Próximos eventos" da Visão geral do Business Detail — Round 6, secção 21:
 * só a fatia de eventos vindos de Renewals precisa de ser reativa (uma
 * Renewal marcada como renovada/cancelada, ou com a `dueDate` editada,
 * noutro sítio da app, tem de desaparecer/mudar aqui sem reload). Os eventos
 * de Deal/Task continuam estáticos (calculados no servidor, em
 * `buildUpcomingEvents`) — não se reescreve a tab toda, só se junta a esta
 * fatia ao vivo, como pedido explicitamente ("extrair só o mínimo").
 */
export function LiveUpcomingEvents({ staticEvents, projectIds, initialRenewals, today }: LiveUpcomingEventsProps) {
  const initialize = useRenewalStore((state) => state.initialize);
  const allRenewals = useRenewalStore((state) => state.renewals);

  useEffect(() => {
    initialize(initialRenewals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const events = useMemo(() => {
    const renewalEvents = buildRenewalEvents(allRenewals, projectIds, today);
    return [...staticEvents, ...renewalEvents].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 4);
  }, [staticEvents, allRenewals, projectIds, today]);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada agendado nos próximos tempos.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((event) => (
        <li key={`${event.date}-${event.text}`} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-foreground">{event.text}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatDateDisplay(event.date)}</span>
        </li>
      ))}
    </ul>
  );
}
