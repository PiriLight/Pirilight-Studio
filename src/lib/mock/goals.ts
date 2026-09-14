import type { Goal } from "@/types";

import type { SeedDates } from "./seed-dates";
import { TASK_IDS } from "./tasks";
import { USER_IDS } from "./users";

export const GOAL_IDS = {
  newClients: "goal-novos-clientes",
  piricardVolume: "goal-piricard-volume",
  responseTime: "goal-tempo-resposta",
} as const;

/** Phase 1B. `progress` é guardado à mão nesta fase (ver `validation/goal.ts`). */
export function buildGoals(d: SeedDates): Goal[] {
  return [
    {
      id: GOAL_IDS.newClients,
      title: "5 novos clientes este trimestre",
      timeframe: "quarter",
      progress: 60,
      ownerId: null,
      linkedTaskIds: [TASK_IDS.phoneStopCall],
      createdAt: d.stamp(-40),
      updatedAt: d.stamp(-5),
    },
    {
      id: GOAL_IDS.piricardVolume,
      title: "1000 PiriCards produzidos no ano",
      timeframe: "year",
      progress: 45,
      ownerId: USER_IDS.bino,
      linkedTaskIds: [],
      createdAt: d.stamp(-120),
      updatedAt: d.stamp(-10),
    },
    {
      id: GOAL_IDS.responseTime,
      title: "Responder a todos os leads em 48h",
      timeframe: "quarter",
      progress: 80,
      ownerId: USER_IDS.sny,
      linkedTaskIds: [],
      createdAt: d.stamp(-40),
      updatedAt: d.stamp(-3),
    },
  ];
}
