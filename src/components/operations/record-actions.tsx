"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CircleCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { deleteOperation, saveOperation } from "@/app/actions/operations";
import type { Client, Project, Task, EntityKind, Snapshot } from "@/lib/operations/model";

export function RecordActions({ kind, record, data }: { kind: EntityKind; record: Client | Project | Task; data: Snapshot }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const name = "title" in record ? record.title : record.name;
  const blocked = kind === "client"
    ? data.projects.some(p => p.business_id === record.id) || data.tasks.some(t => t.business_id === record.id)
    : kind === "project" && data.tasks.some(t => t.project_id === record.id);
  const task = kind === "task" ? record as Task : null;
  function run(remove: boolean) {
    setError("");
    startTransition(async () => {
      try {
        const result = remove
          ? await deleteOperation({ kind, id: record.id, version: record.updated_at })
          : await saveOperation({ kind, id: record.id, version: record.updated_at, values: { ...record, status: task?.status === "done" ? "todo" : "done", waiting_note: "", review_date: null } });
        if (!result.ok) { setError(result.message); return; }
        if (remove) router.replace(kind === "client" ? "/clients" : kind === "project" ? "/projects" : "/tasks");
        router.refresh();
        setOpen(false);
      } catch { setError("Não foi possível confirmar a alteração. Atualiza a página antes de tentar novamente."); }
    });
  }
  return <>
    {task && <Button variant="outline" disabled={pending} onClick={() => run(false)}>
      {task.status === "done" ? <RotateCcw className="mr-2 h-4 w-4" /> : <CircleCheck className="mr-2 h-4 w-4" />}
      {task.status === "done" ? "Reabrir tarefa" : "Concluir tarefa"}
    </Button>}
    <Button variant="outline" disabled={pending} onClick={() => { setError(""); setOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Apagar</Button>
    {error && !open && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
      <DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("cancel-operation-delete")?.focus(); }}>
        <DialogTitle>Apagar “{name}”?</DialogTitle>
        <DialogDescription>{blocked ? "Este registo tem trabalho associado. Move ou apaga primeiro as tarefas e os projetos ligados, para poderes continuar." : "Esta ação é definitiva. O registo será apagado e a ação ficará no histórico da equipa."}</DialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button id="cancel-operation-delete" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={pending || Boolean(blocked)} onClick={() => run(true)}>{pending ? "A apagar…" : "Apagar definitivamente"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
