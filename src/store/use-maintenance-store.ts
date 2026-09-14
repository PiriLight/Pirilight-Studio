import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  applyMaintenanceRequestPatch,
  buildNewMaintenanceRequest,
} from "@/lib/data/maintenance-board";
import type { MaintenanceRequestPatch, NewMaintenanceRequestInput } from "@/lib/data/maintenance-board";
import type { MaintenanceRequest, WaitingReason, WorkStatus } from "@/types";

/**
 * A mesma filosofia exata de `useTaskStore`/`useProjectStore`/
 * `useRenewalStore`/`useGoalStore`: uma cópia local mutável dos pedidos de
 * manutenção, persistida em localStorage, que semeia a partir do snapshot do
 * servidor **só na primeira vez** (`initialized === false`) — depois disso é
 * a fonte da verdade, nunca sobrescrita numa navegação seguinte.
 *
 * Toda a validação/invariante vive em `lib/data/maintenance-board.ts` — esta
 * store só chama essas funções puras e faz `set()`.
 */
interface MaintenanceState {
  requests: MaintenanceRequest[];
  initialized: boolean;
  initialize: (requests: MaintenanceRequest[]) => void;
  createRequest: (input: NewMaintenanceRequestInput & { businessId: string }) => void;
  updateRequest: (id: string, patch: MaintenanceRequestPatch) => void;
  setRequestStatus: (id: string, status: WorkStatus, waitingReason: WaitingReason | null) => void;
  completeRequest: (id: string) => void;
  reopenRequest: (id: string) => void;
}

function replaceRequest(requests: MaintenanceRequest[], id: string, next: MaintenanceRequest): MaintenanceRequest[] {
  return requests.map((request) => (request.id === id ? next : request));
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      requests: [],
      initialized: false,

      initialize: (requests) => {
        if (get().initialized) return;
        set({ requests, initialized: true });
      },

      createRequest: (input) => {
        const request = buildNewMaintenanceRequest(input);
        set((state) => ({ requests: [...state.requests, request] }));
      },

      updateRequest: (id, patch) => {
        const current = get().requests.find((request) => request.id === id);
        if (current === undefined) return;
        set((state) => ({
          requests: replaceRequest(state.requests, id, applyMaintenanceRequestPatch(current, patch)),
        }));
      },

      setRequestStatus: (id, status, waitingReason) => {
        get().updateRequest(id, { status, waitingReason });
      },

      completeRequest: (id) => {
        get().updateRequest(id, { status: "done", waitingReason: null });
      },

      // Sem histórico de estado nesta fase: reabrir volta sempre a "todo",
      // o valor neutro mais seguro (mesma regra de useTaskStore).
      reopenRequest: (id) => {
        get().updateRequest(id, { status: "todo", waitingReason: null });
      },
    }),
    { name: "pirilight-maintenance" },
  ),
);
