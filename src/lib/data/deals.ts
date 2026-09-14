import type { Deal } from "@/types";

import { getMockData, read } from "./internal";

export async function getDeals(now: Date = new Date()): Promise<Deal[]> {
  return read(getMockData(now).deals);
}

export async function getDealById(id: string, now: Date = new Date()): Promise<Deal | null> {
  return read(getMockData(now).deals.find((d) => d.id === id) ?? null);
}

export async function getDealsByBusinessId(
  businessId: string,
  now: Date = new Date(),
): Promise<Deal[]> {
  return read(getMockData(now).deals.filter((d) => d.businessId === businessId));
}

/** Oportunidades ainda em aberto (nem ganhas, nem perdidas). */
export async function getOpenDeals(now: Date = new Date()): Promise<Deal[]> {
  return read(
    getMockData(now).deals.filter((d) => d.stage !== "won" && d.stage !== "lost"),
  );
}
