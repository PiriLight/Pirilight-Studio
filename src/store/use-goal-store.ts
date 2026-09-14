import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyGoalPatch, applyGoalProgress, buildNewGoal } from "@/lib/data/goal-board";
import type { GoalPatch, NewGoalInput } from "@/lib/data/goal-board";
import type { Goal } from "@/types";

/**
 * A mesma filosofia exata de `useTaskStore`/`useProjectStore`/
 * `useRenewalStore`: uma cópia local mutável dos Goals, persistida em
 * localStorage, que semeia a partir do snapshot do servidor **só na primeira
 * vez** (`initialized === false`) — depois disso é a fonte da verdade, e
 * nunca é sobrescrita numa navegação seguinte.
 *
 * Ações mínimas de propósito (secção "STATE MANAGEMENT" do pedido): toda a
 * lógica de domínio (validação, invariantes) vive em `lib/data/goal-board.ts`
 * — esta store só chama essas funções puras e faz `set()`.
 */
interface GoalState {
  goals: Goal[];
  initialized: boolean;
  initialize: (goals: Goal[]) => void;
  createGoal: (input: NewGoalInput) => void;
  updateGoal: (id: string, patch: GoalPatch) => void;
  setGoalProgress: (id: string, progress: number) => void;
}

function replaceGoal(goals: Goal[], id: string, next: Goal): Goal[] {
  return goals.map((goal) => (goal.id === id ? next : goal));
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      initialized: false,

      initialize: (goals) => {
        if (get().initialized) return;
        set({ goals, initialized: true });
      },

      createGoal: (input) => {
        const goal = buildNewGoal(input);
        set((state) => ({ goals: [...state.goals, goal] }));
      },

      updateGoal: (id, patch) => {
        const current = get().goals.find((goal) => goal.id === id);
        if (current === undefined) return;
        set((state) => ({ goals: replaceGoal(state.goals, id, applyGoalPatch(current, patch)) }));
      },

      setGoalProgress: (id, progress) => {
        const current = get().goals.find((goal) => goal.id === id);
        if (current === undefined) return;
        set((state) => ({ goals: replaceGoal(state.goals, id, applyGoalProgress(current, progress)) }));
      },
    }),
    { name: "pirilight-goals" },
  ),
);
