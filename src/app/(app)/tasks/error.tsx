"use client";

import { OperationalError } from "@/components/work-management/operational-error";

export default function TasksError({ reset }: { error: Error; reset: () => void }) {
  return <OperationalError reset={reset} area="as tarefas" />;
}
