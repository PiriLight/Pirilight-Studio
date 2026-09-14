"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/store/use-task-store";
import type { Task, User } from "@/types";

/**
 * Botão "+ Novo objetivo" do cabeçalho de `/goals` — dono do dialog em modo
 * criação. Lê `useTaskStore` ao vivo (não o snapshot estático do servidor)
 * para o multi-select "Tasks ligadas" incluir uma Task criada momentos antes
 * nesta mesma sessão, mesmo que o servidor ainda não a conheça — o `initialize`
 * é idempotente (semeia só uma vez), por isso é seguro chamá-lo aqui mesmo
 * que o `GoalsBoard` já o tenha feito.
 */
export function NewGoalButton({ users, initialTasks }: { users: User[]; initialTasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const initializeTasks = useTaskStore((state) => state.initialize);
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    initializeTasks(initialTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo objetivo
      </Button>
      <GoalFormDialog key={open ? "new" : "closed"} open={open} onOpenChange={setOpen} users={users} tasks={tasks} />
    </>
  );
}
