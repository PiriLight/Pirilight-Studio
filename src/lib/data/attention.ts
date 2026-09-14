import { todayIso } from "@/lib/utils/date";
import type { AttentionItem, BlockedProjectItem, WaitingOnClientItem } from "@/types";

import {
  buildAttentionItems,
  buildBlockedProjects,
  buildWaitingOnClientItems,
} from "./attention-rules";
import { getMockData } from "./internal";

/**
 * Camada assíncrona por cima da lógica pura: lê os dados e delega.
 *
 * A regra de urgência vive toda em `attention-rules.ts` — aqui não há decisões,
 * só leitura. É por isso que os testes conseguem cobrir a parte difícil sem
 * tocar em I/O.
 *
 * Nota: `now` também ancora a mock data, por isso `getAttentionItems(TEST_TODAY)`
 * é completamente determinístico, ponta a ponta.
 */
export async function getAttentionItems(now: Date = new Date()): Promise<AttentionItem[]> {
  const data = getMockData(now);
  return buildAttentionItems(data, now);
}

/** Subconjunto do feed: o que já está atrasado. */
export async function getOverdueAttentionItems(now: Date = new Date()): Promise<AttentionItem[]> {
  const items = await getAttentionItems(now);
  return items.filter((item) => item.urgency === "overdue");
}

/**
 * Follow-ups comerciais para hoje. Deriva do mesmo feed — não reimplementa a
 * regra de urgência, para não haver duas versões da verdade que divergem na
 * primeira vez que se afinar uma janela.
 */
export async function getFollowUpsDueToday(now: Date = new Date()): Promise<AttentionItem[]> {
  const items = await getAttentionItems(now);
  return items.filter((item) => item.kind === "deal" && item.urgency === "due_today");
}

/** Follow-ups comerciais atrasados (inclui os que estão simplesmente parados). */
export async function getOverdueFollowUps(now: Date = new Date()): Promise<AttentionItem[]> {
  const items = await getAttentionItems(now);
  return items.filter(
    (item) => item.kind === "deal" && (item.urgency === "overdue" || item.urgency === "stalled"),
  );
}

/** O que está parado à espera de terceiros — nunca contado como trabalho nosso atrasado. */
export async function getWaitingOnClientItems(
  now: Date = new Date(),
): Promise<WaitingOnClientItem[]> {
  return buildWaitingOnClientItems(getMockData(now));
}

/** Projetos bloqueados: é nosso para desbloquear. */
export async function getBlockedProjects(now: Date = new Date()): Promise<BlockedProjectItem[]> {
  const data = getMockData(now);
  return buildBlockedProjects(data.projects, data.businesses);
}

/** Dia de calendário a que uma leitura corresponde — útil para cabeçalhos ("Hoje, 15 de janeiro"). */
export function getReferenceDate(now: Date = new Date()): string {
  return todayIso(now);
}
