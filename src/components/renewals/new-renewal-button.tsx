"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { RenewalFormDialog } from "@/components/renewals/renewal-form-dialog";
import { Button } from "@/components/ui/button";
import type { Business, Project } from "@/types";

/** Botão "+ Nova renovação" — dono do dialog em modo criação. */
export function NewRenewalButton({
  businesses,
  projects,
  defaultProjectId,
}: {
  businesses: Business[];
  projects: Project[];
  /** Round 6 — pré-seleção quando usado a partir do Website/PiriCard Detail. */
  defaultProjectId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nova renovação
      </Button>
      <RenewalFormDialog
        key={open ? "new" : "closed"}
        open={open}
        onOpenChange={setOpen}
        businesses={businesses}
        projects={projects}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
