import type { Task } from "@/types";

import { BUSINESS_IDS } from "./businesses";
import { DEAL_IDS } from "./deals";
import { MAINTENANCE_IDS } from "./maintenance-requests";
import { PROJECT_IDS } from "./projects";
import type { SeedDates } from "./seed-dates";
import { USER_IDS } from "./users";

export const TASK_IDS = {
  boiNaBrasaChasePhotos: "task-boi-na-brasa-photos",
  boiNaBrasaMenu: "task-boi-na-brasa-menu",
  autoformigalContent: "task-autoformigal-content",
  autoformigalDone: "task-autoformigal-done",
  talhoUnblock: "task-talho-unblock",
  beautyPrintCheck: "task-beauty-print-check",
  phoneStopCall: "task-phone-stop-call",
  clinicaMaintenance: "task-clinica-maintenance",
  ginasioBacklog: "task-ginasio-backlog",
  studioVetorialFollowUp: "task-studio-vetorial-followup",
  cafeCentralInvoice: "task-cafe-central-invoice",
  opticaWaiting: "task-optica-waiting",
} as const;

/**
 * Tarefas repartidas entre o Sny e o Bino.
 *
 * A tarefa mais importante deste ficheiro é a primeira: o projeto do Boi na
 * Brasa está `waiting_on_client` (à espera de fotografias), e a ação **nossa**
 * associada existe como Task própria, já vencida. É este par que prova a regra
 * central: o projeto não conta como trabalho nosso atrasado, a tarefa conta.
 */
export function buildTasks(d: SeedDates): Task[] {
  return [
    {
      // CENÁRIO-CHAVE: ação nossa sobre um projeto à espera do cliente.
      id: TASK_IDS.boiNaBrasaChasePhotos,
      title: "Insistir pelas fotografias — Boi na Brasa",
      status: "todo",
      waitingReason: null,
      priority: "high",
      dueDate: d.day(-2),
      assigneeId: USER_IDS.sny,
      relatedEntityType: "project",
      relatedEntityId: PROJECT_IDS.boiNaBrasaWeb,
      createdAt: d.stamp(-12),
      updatedAt: d.stamp(-12),
    },
    {
      // Vence hoje.
      id: TASK_IDS.boiNaBrasaMenu,
      title: "Rever texto da ementa — Boi na Brasa",
      status: "in_progress",
      waitingReason: null,
      priority: "normal",
      dueDate: d.day(0),
      assigneeId: USER_IDS.sny,
      relatedEntityType: "project",
      relatedEntityId: PROJECT_IDS.boiNaBrasaWeb,
      createdAt: d.stamp(-6),
      updatedAt: d.stamp(-1),
    },
    {
      // Vence dentro da janela (3 dias).
      id: TASK_IDS.autoformigalContent,
      title: "Integrar conteúdos da oficina — Autoformigal",
      status: "in_progress",
      waitingReason: null,
      priority: "normal",
      dueDate: d.day(3),
      assigneeId: USER_IDS.bino,
      relatedEntityType: "project",
      relatedEntityId: PROJECT_IDS.autoformigalWeb,
      createdAt: d.stamp(-10),
      updatedAt: d.stamp(-3),
    },
    {
      // FIXTURE NEGATIVA: concluída e com data passada — nunca pode aparecer
      // como atrasada.
      id: TASK_IDS.autoformigalDone,
      title: "Preparar ambiente de staging — Autoformigal",
      status: "done",
      waitingReason: null,
      priority: "normal",
      dueDate: d.day(-20),
      assigneeId: USER_IDS.bino,
      relatedEntityType: "project",
      relatedEntityId: PROJECT_IDS.autoformigalWeb,
      createdAt: d.stamp(-40),
      updatedAt: d.stamp(-19),
    },
    {
      // Bloqueado com data passada: é nosso para desbloquear → conta como atrasado.
      id: TASK_IDS.talhoUnblock,
      title: "Recuperar acesso ao domínio — Talho do Bairro",
      status: "blocked",
      waitingReason: null,
      priority: "high",
      dueDate: d.day(-6),
      assigneeId: USER_IDS.sny,
      relatedEntityType: "project",
      relatedEntityId: PROJECT_IDS.talhoWeb,
      createdAt: d.stamp(-30),
      updatedAt: d.stamp(-15),
    },
    {
      id: TASK_IDS.beautyPrintCheck,
      title: "Confirmar provas de impressão — Beauty Connection",
      status: "in_progress",
      waitingReason: null,
      priority: "high",
      dueDate: d.day(1),
      assigneeId: USER_IDS.bino,
      relatedEntityType: "project",
      relatedEntityId: PROJECT_IDS.beautyCard,
      createdAt: d.stamp(-8),
      updatedAt: d.stamp(-2),
    },
    {
      // Ligada a um Deal (par polimórfico com type 'deal').
      id: TASK_IDS.phoneStopCall,
      title: "Preparar proposta — Phone Stop",
      status: "todo",
      waitingReason: null,
      priority: "normal",
      dueDate: d.day(2),
      assigneeId: USER_IDS.bino,
      relatedEntityType: "deal",
      relatedEntityId: DEAL_IDS.phoneStop,
      createdAt: d.stamp(-2),
      updatedAt: d.stamp(-2),
    },
    {
      // Ligada a um pedido de manutenção.
      id: TASK_IDS.clinicaMaintenance,
      title: "Atualizar horários no site — Clínica Sorriso",
      status: "todo",
      waitingReason: null,
      priority: "normal",
      dueDate: d.day(4),
      assigneeId: USER_IDS.sny,
      relatedEntityType: "maintenance_request",
      relatedEntityId: MAINTENANCE_IDS.clinicaHorarios,
      createdAt: d.stamp(-11),
      updatedAt: d.stamp(-11),
    },
    {
      // Backlog sem data: visível em /tasks, nunca no feed de atenção.
      id: TASK_IDS.ginasioBacklog,
      title: "Rever fotografias antigas do Ginásio Impulso",
      status: "todo",
      waitingReason: null,
      priority: "low",
      dueDate: null,
      assigneeId: USER_IDS.sny,
      relatedEntityType: "business",
      relatedEntityId: BUSINESS_IDS.ginasioImpulso,
      createdAt: d.stamp(-25),
      updatedAt: d.stamp(-25),
    },
    {
      // Fora da janela (20 dias): existe, mas ainda não é "atenção".
      id: TASK_IDS.studioVetorialFollowUp,
      title: "Preparar segunda versão da proposta — Studio Vetorial",
      status: "todo",
      waitingReason: null,
      priority: "normal",
      dueDate: d.day(20),
      assigneeId: USER_IDS.sny,
      relatedEntityType: "deal",
      relatedEntityId: DEAL_IDS.studioVetorial,
      createdAt: d.stamp(-10),
      updatedAt: d.stamp(-10),
    },
    {
      id: TASK_IDS.cafeCentralInvoice,
      title: "Arquivar documentação — Café Central",
      status: "done",
      waitingReason: null,
      priority: "low",
      dueDate: d.day(-55),
      assigneeId: USER_IDS.bino,
      relatedEntityType: "business",
      relatedEntityId: BUSINESS_IDS.cafeCentral,
      createdAt: d.stamp(-70),
      updatedAt: d.stamp(-55),
    },
    {
      // Tarefa à espera do cliente: sai do feed de atenção, entra no de espera.
      id: TASK_IDS.opticaWaiting,
      title: "Receber logótipo em vetor — Óptica Visão Clara",
      status: "waiting_on_client",
      waitingReason: "content",
      priority: "normal",
      dueDate: d.day(-8),
      assigneeId: USER_IDS.bino,
      relatedEntityType: "business",
      relatedEntityId: BUSINESS_IDS.optica,
      createdAt: d.stamp(-30),
      updatedAt: d.stamp(-18),
    },
  ];
}
