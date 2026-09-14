import type { User } from "@/types";

import type { SeedDates } from "./seed-dates";

/** Os dois fundadores. IDs estáveis, usados em toda a mock data. */
export const USER_IDS = {
  sny: "sny",
  bino: "bino",
} as const;

export function buildUsers(d: SeedDates): User[] {
  return [
    {
      id: USER_IDS.sny,
      name: "Sny",
      initials: "SN",
      accentColor: "#168CFF",
      createdAt: d.stamp(-720),
      updatedAt: d.stamp(-720),
    },
    {
      id: USER_IDS.bino,
      name: "Bino",
      initials: "BI",
      accentColor: "#FF6E42",
      createdAt: d.stamp(-720),
      updatedAt: d.stamp(-720),
    },
  ];
}
