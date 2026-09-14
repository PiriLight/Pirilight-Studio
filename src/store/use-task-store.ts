import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyTaskPatch, buildNewTask } from "@/lib/data/task-board";
import type { NewTaskInput, TaskPatch } from "@/lib/data/task-board";
import type { Task, WaitingReason, WorkStatus } from "@/types";

/**
 * A primeira escrita real da Phase 1: uma cópia local e mutável das Tasks,
 * persistida em localStorage. Toda a validação/invariante vive nas funções
 * puras de `lib/data/task-board.ts` (`buildNewTask`/`applyTaskPatch`) — esta
 * store é só um contentor fino que as chama e faz `set()`.
 *
 * `initialize()` semeia a store a partir do snapshot do servidor **só na
 * primeira vez** (`initialized === false`); depois disso a store é a fonte
 * da verdade. Consequência aceite: as 12 tarefas mock deixam de ser
 * recalculadas a cada visita a partir de `buildMockData(new Date())` — ficam
 * "congeladas" na forma em que estavam na primeira vez que a app correu neste
 * browser, tal como aconteceria com uma base de dados real. É descartável por
 * desenho: substituída por Server Actions/mutações Supabase mais tarde, nunca
 * "evoluída" a partir daqui.
 */
interface TaskState {
  tasks: Task[];
  initialized: boolean;
  initialize: (tasks: Task[]) => void;
  createTask: (input: NewTaskInput) => void;
  updateTask: (id: string, patch: TaskPatch) => void;
  setTaskStatus: (id: string, status: WorkStatus, waitingReason: WaitingReason | null) => void;
  setTaskAssignee: (id: string, assigneeId: string) => void;
  completeTask: (id: string) => void;
  reopenTask: (id: string) => void;
}

function replaceTask(tasks: Task[], id: string, next: Task): Task[] {
  return tasks.map((task) => (task.id === id ? next : task));
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      initialized: false,

      initialize: (tasks) => {
        if (get().initialized) return;
        set({ tasks, initialized: true });
      },

      createTask: (input) => {
        const task = buildNewTask(input);
        set((state) => ({ tasks: [...state.tasks, task] }));
      },

      updateTask: (id, patch) => {
        const current = get().tasks.find((task) => task.id === id);
        if (current === undefined) return;
        set((state) => ({ tasks: replaceTask(state.tasks, id, applyTaskPatch(current, patch)) }));
      },

      setTaskStatus: (id, status, waitingReason) => {
        get().updateTask(id, { status, waitingReason });
      },

      setTaskAssignee: (id, assigneeId) => {
        get().updateTask(id, { assigneeId });
      },

      completeTask: (id) => {
        get().updateTask(id, { status: "done", waitingReason: null });
      },

      // Sem histórico de estado nesta fase: reabrir volta sempre a "todo",
      // o valor neutro mais seguro (não guardamos qual era o estado antes
      // de concluir).
      reopenTask: (id) => {
        get().updateTask(id, { status: "todo", waitingReason: null });
      },
    }),
    { name: "pirilight-tasks" },
  ),
);
