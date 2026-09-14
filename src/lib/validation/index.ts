/**
 * Schemas Zod — a fonte única de verdade da forma dos dados **nesta fase**.
 *
 * Os tipos da aplicação são inferidos a partir daqui (ver `src/types`), o que
 * evita manter duas definições em paralelo. Quando os tipos gerados pela
 * Supabase chegarem, muda-se apenas `src/types` — nenhum consumidor é tocado,
 * porque nada fora de `src/types` importa schemas para obter tipos.
 *
 * Por isso mesmo, os schemas de entidade **validam, não transformam**: sem
 * `.transform()` que altere a forma, para o tipo inferido continuar
 * estruturalmente igual a uma linha de tabela.
 */
export * from "./common";
export * from "./work-status";
export * from "./user";
export * from "./business";
export * from "./contact";
export * from "./deal";
export * from "./project";
export * from "./task";
export * from "./renewal";
export * from "./payment";
export * from "./maintenance-request";
export * from "./goal";
export * from "./material-asset";
