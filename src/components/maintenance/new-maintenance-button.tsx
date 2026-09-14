"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { MaintenanceFormDialog } from "@/components/maintenance/maintenance-form-dialog";
import { Button } from "@/components/ui/button";
import type { Business, Project, User } from "@/types";

/** Botão "+ Novo pedido" — dono do dialog em modo criação. */
export function NewMaintenanceButton({
  projects,
  businesses,
  users,
  today,
  defaultProjectId,
}: {
  projects: Project[];
  businesses: Business[];
  users: User[];
  today: string;
  /** Round 9 — pré-seleção quando usado a partir do Website/PiriCard Detail. */
  defaultProjectId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Novo pedido
      </Button>
      <MaintenanceFormDialog
        key={open ? "new" : "closed"}
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        businesses={businesses}
        users={users}
        today={today}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
