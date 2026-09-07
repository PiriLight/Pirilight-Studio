"use client";

import { OperationalError } from "@/components/work-management/operational-error";

export default function GoalsError({ reset }: { error: Error; reset: () => void }) {
  return <OperationalError reset={reset} area="os objetivos" />;
}
