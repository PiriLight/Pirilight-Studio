/**
 * **A única fronteira de dados exposta à aplicação.**
 *
 * Nenhum componente importa de `@/lib/mock` — tudo passa por aqui. Hoje estas
 * funções leem fixtures em memória; amanhã leem Supabase. Quando isso
 * acontecer, muda o interior destas funções e mais nada: as assinaturas já são
 * assíncronas, já recebem filtros, e já devolvem objetos próprios.
 *
 * `internal.ts` não é reexportado de propósito — é o que sabe de onde vêm os
 * dados, e esse conhecimento não deve escapar daqui.
 */
export * from "./businesses";
export * from "./deals";
export * from "./projects";
export * from "./tasks";
export * from "./renewals";
export * from "./payments";
export * from "./misc";
export * from "./attention";
export * from "./business-overview";
export * from "./task-board";
export * from "./project-overview";
export * from "./renewal-board";
export * from "./goal-board";
export * from "./maintenance-board";
export {
  ATTENTION_WINDOW_DAYS,
  RENEWALS_PANEL_WINDOW_DAYS,
  STALLED_AFTER_DAYS,
  classifyUrgency,
} from "./attention-rules";
