import { addDaysIso, isoDateToTimestamp, todayIso } from "@/lib/utils/date";

/**
 * Todas as fixtures são escritas em **datas relativas a uma âncora**, nunca em
 * datas absolutas.
 *
 * Porquê: um cenário escrito como "renovação a 3 de setembro" deixa de ser
 * "amanhã" no dia 3 — os 15 cenários cuidadosamente montados apodreciam em 24
 * horas. Com uma âncora, "renovação amanhã" é verdade para sempre.
 *
 * E porque a âncora é um **parâmetro**, os testes não ficam à mercê do relógio
 * da máquina: constroem o dataset com `TEST_TODAY` e obtêm sempre exatamente as
 * mesmas datas.
 */
export interface SeedDates {
  /** Dia de calendário da âncora ("2026-01-15"). */
  today: string;
  /** Dia de calendário deslocado n dias (negativo = passado). */
  day(offset: number): string;
  /** Timestamp ISO completo para o dia deslocado n dias. */
  stamp(offset: number): string;
}

export function createSeedDates(anchor: Date): SeedDates {
  const today = todayIso(anchor);

  return {
    today,
    day: (offset) => addDaysIso(today, offset),
    stamp: (offset) => isoDateToTimestamp(addDaysIso(today, offset)),
  };
}

/**
 * Âncora fixa usada **exclusivamente nos testes**. Quinta-feira, 15 de janeiro
 * de 2026 — um dia útil, fora de qualquer mudança de hora.
 *
 * Nenhum teste lê o relógio da máquina: constroem `buildMockData(TEST_TODAY)`
 * e passam `now = TEST_TODAY`.
 */
export const TEST_TODAY = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
