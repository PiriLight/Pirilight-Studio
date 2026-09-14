import { buildMockData, type MockDataset } from "@/lib/mock";
import { todayIso } from "@/lib/utils/date";

/**
 * Interior da camada de dados — **não é exportado por `lib/data/index.ts`**.
 *
 * É aqui, e só aqui, que se sabe que os dados vêm de fixtures em memória.
 * Quando o Supabase chegar, é este ficheiro que muda; nenhuma função pública
 * nem nenhum componente é tocado.
 */

let cache: { anchorDate: string; data: MockDataset } | null = null;

/**
 * Dataset ancorado num dia. Memorizado por dia, para o servidor não
 * reconstruir as fixtures a cada leitura — mas também para não ficar preso ao
 * dia em que arrancou.
 */
export function getMockData(now: Date): MockDataset {
  const anchorDate = todayIso(now);
  if (cache?.anchorDate === anchorDate) return cache.data;

  const data = buildMockData(now);
  cache = { anchorDate, data };
  return data;
}

/**
 * As fixtures são partilhadas em memória: sem cópia, um consumidor distraído
 * mutava o "estado global" de toda a aplicação. Imita também o que um backend
 * real devolve — objetos novos a cada leitura.
 */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Todas as leituras são assíncronas desde já, para o dia em que forem mesmo I/O. */
export async function read<T>(value: T): Promise<T> {
  return clone(value);
}
