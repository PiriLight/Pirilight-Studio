import type { MaintenanceRequest } from "@/types";

import { BUSINESS_IDS } from "./businesses";
import { PROJECT_IDS } from "./projects";
import type { SeedDates } from "./seed-dates";
import { USER_IDS } from "./users";

export const MAINTENANCE_IDS = {
  clinicaHorarios: "mnt-clinica-horarios",
  ginasioPrecos: "mnt-ginasio-precos",
  cafeCentralFechado: "mnt-cafe-central-rodape",
  boiNaBrasaFotos: "mnt-boi-na-brasa-fotos",
  talhoPrecos: "mnt-talho-precos",
} as const;

/**
 * Pedidos de manutenção/alteração — Round 9 torna `/maintenance` num módulo
 * real; os dados já existiam desde o Round 2 porque alimentam o feed de
 * atenção.
 *
 * Cobertura: um pedido com data (entra pela data), um pedido **sem data**
 * aberto há muito tempo (entra como `stalled`), um pedido concluído (nunca
 * entra, por muito antigo que seja), um pedido `waiting_on_client` com prazo
 * já passado (Round 9, secção 4 — nunca "atrasado", é o par que prova a
 * regra central) e um pedido `blocked` com prazo no futuro (Round 9, secção
 * 5 — vermelho por ser bloqueado, não por estar atrasado).
 */
export function buildMaintenanceRequests(d: SeedDates): MaintenanceRequest[] {
  return [
    {
      id: MAINTENANCE_IDS.clinicaHorarios,
      projectId: PROJECT_IDS.clinicaWeb,
      businessId: BUSINESS_IDS.clinicaSorriso,
      title: "Atualizar horários de atendimento",
      description: "Novos horários de verão para a página de contactos.",
      status: "todo",
      waitingReason: null,
      priority: "normal",
      responsibleUserId: USER_IDS.bino,
      requestedAt: d.day(-11),
      dueDate: d.day(4),
      createdAt: d.stamp(-11),
      updatedAt: d.stamp(-11),
    },
    {
      // Sem data e aberto há 20 dias → stalled.
      id: MAINTENANCE_IDS.ginasioPrecos,
      projectId: PROJECT_IDS.ginasioWeb,
      businessId: BUSINESS_IDS.ginasioImpulso,
      title: "Rever tabela de preços das aulas",
      description: "Pedido por email, sem prazo acordado.",
      status: "todo",
      waitingReason: null,
      priority: "low",
      // Não atribuído de propósito — cobre esse caso no seed.
      responsibleUserId: null,
      requestedAt: d.day(-20),
      dueDate: null,
      createdAt: d.stamp(-20),
      updatedAt: d.stamp(-20),
    },
    {
      // Concluído e antigo: nunca gera atenção.
      id: MAINTENANCE_IDS.cafeCentralFechado,
      projectId: PROJECT_IDS.cafeCentralCard,
      businessId: BUSINESS_IDS.cafeCentral,
      title: "Corrigir rodapé com morada antiga",
      description: "Morada desatualizada no verso dos cartões.",
      status: "done",
      waitingReason: null,
      priority: "normal",
      responsibleUserId: USER_IDS.sny,
      requestedAt: d.day(-70),
      dueDate: d.day(-65),
      createdAt: d.stamp(-70),
      updatedAt: d.stamp(-64),
    },
    {
      // waiting_on_client com dueDate no passado — nunca "Atrasado" (secção 4).
      id: MAINTENANCE_IDS.boiNaBrasaFotos,
      projectId: PROJECT_IDS.boiNaBrasaWeb,
      businessId: BUSINESS_IDS.boiNaBrasa,
      title: "Substituir fotografias da ementa",
      description: "O cliente vai enviar fotografias novas dos pratos principais para a página do menu.",
      status: "waiting_on_client",
      waitingReason: "photos",
      priority: "normal",
      responsibleUserId: USER_IDS.sny,
      requestedAt: d.day(-9),
      dueDate: d.day(-2),
      createdAt: d.stamp(-9),
      updatedAt: d.stamp(-2),
    },
    {
      // blocked com dueDate no futuro — vermelho por ser blocked, nunca por estar atrasado (secção 5).
      id: MAINTENANCE_IDS.talhoPrecos,
      projectId: PROJECT_IDS.talhoWeb,
      businessId: BUSINESS_IDS.talho,
      title: "Atualizar tabela de preços dos cortes",
      description: "Preços novos fornecidos pelo cliente, mas o acesso ao domínio ainda está por recuperar.",
      status: "blocked",
      waitingReason: null,
      priority: "high",
      responsibleUserId: USER_IDS.bino,
      requestedAt: d.day(-6),
      dueDate: d.day(5),
      createdAt: d.stamp(-6),
      updatedAt: d.stamp(-1),
    },
  ];
}
