import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyRenewalPatch, applyRenewalStatus, buildNewRenewal } from "@/lib/data/renewal-board";
import type { NewRenewalInput, RenewalPatch } from "@/lib/data/renewal-board";
import type { Renewal, RenewalStatus } from "@/types";

/**
 * A mesma filosofia exata de `useTaskStore`/`useProjectStore`: uma cópia
 * local mutável das Renewals, persistida em localStorage, que semeia a
 * partir do snapshot do servidor **só na primeira vez**
 * (`initialized === false`) — depois disso é a fonte da verdade.
 *
 * Guarda só `Renewal[]` — nunca joins com Business/Project/User. Toda a
 * validação/invariante vive nas funções puras de
 * `lib/data/renewal-board.ts` (`buildNewRenewal`/`applyRenewalPatch`/
 * `applyRenewalStatus`) — esta store só chama e faz `set()`.
 */
interface RenewalState {
  renewals: Renewal[];
  initialized: boolean;
  initialize: (renewals: Renewal[]) => void;
  createRenewal: (input: NewRenewalInput) => void;
  updateRenewal: (id: string, patch: RenewalPatch) => void;
  setRenewalStatus: (id: string, status: RenewalStatus) => void;
  markRenewed: (id: string) => void;
  cancelRenewal: (id: string) => void;
  reopenRenewal: (id: string) => void;
}

function replaceRenewal(renewals: Renewal[], id: string, next: Renewal): Renewal[] {
  return renewals.map((renewal) => (renewal.id === id ? next : renewal));
}

export const useRenewalStore = create<RenewalState>()(
  persist(
    (set, get) => ({
      renewals: [],
      initialized: false,

      initialize: (renewals) => {
        if (get().initialized) return;
        set({ renewals, initialized: true });
      },

      createRenewal: (input) => {
        const renewal = buildNewRenewal(input);
        set((state) => ({ renewals: [...state.renewals, renewal] }));
      },

      updateRenewal: (id, patch) => {
        const current = get().renewals.find((renewal) => renewal.id === id);
        if (current === undefined) return;
        set((state) => ({
          renewals: replaceRenewal(state.renewals, id, applyRenewalPatch(current, patch)),
        }));
      },

      setRenewalStatus: (id, status) => {
        const current = get().renewals.find((renewal) => renewal.id === id);
        if (current === undefined) return;
        set((state) => ({
          renewals: replaceRenewal(state.renewals, id, applyRenewalStatus(current, status)),
        }));
      },

      markRenewed: (id) => {
        get().setRenewalStatus(id, "renewed");
      },

      cancelRenewal: (id) => {
        get().setRenewalStatus(id, "cancelled");
      },

      // Sem histórico nesta fase: reabrir volta sempre a "pending", o valor
      // neutro mais seguro (mesma regra de `reopenTask` no Round 4).
      reopenRenewal: (id) => {
        get().setRenewalStatus(id, "pending");
      },
    }),
    { name: "pirilight-renewals" },
  ),
);
