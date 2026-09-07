"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  archiveBusinessAction,
  createClientAction,
  updateBusinessAction,
  type CrmActionResult,
} from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Business } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business?: Business;
  onSuccess?: (message: string) => void;
}

const EMPTY_RESULT: CrmActionResult | null = null;

export function BusinessFormDialog({ open, onOpenChange, business, onSuccess }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CrmActionResult | null>(EMPTY_RESULT);
  const [name, setName] = useState(business?.name ?? "");
  const [industry, setIndustry] = useState(business?.industry === "Sem setor definido" ? "" : (business?.industry ?? ""));
  const [location, setLocation] = useState(
    business?.location === "Sem localização definida" ? "" : (business?.location ?? ""),
  );
  const [notes, setNotes] = useState(business?.notes ?? "");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const input = { name, industry, location, notes };
      const next = business
        ? await updateBusinessAction(business.id, input)
        : await createClientAction(
            input,
            contactName.trim()
              ? {
                  name: contactName,
                  role: contactRole,
                  email: contactEmail,
                  phone: contactPhone,
                  isPrimary: true,
                }
              : undefined,
          );
      setResult(next);
      if (next.ok) {
        onSuccess?.(next.message);
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  function archive() {
    if (!business || !window.confirm(`Arquivar ${business.name}? O histórico será preservado.`)) return;
    setResult(null);
    startTransition(async () => {
      const next = await archiveBusinessAction(business.id);
      setResult(next);
      if (next.ok) {
        onSuccess?.(next.message);
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{business ? "Editar cliente" : "Adicionar cliente"}</DialogTitle>
          <DialogDescription>
            {business
              ? "Atualiza os dados centrais deste Business."
              : "Cria um Business diretamente no estado Cliente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome comercial" required>
              <Input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
            </Field>
            <Field label="Setor">
              <Input value={industry} onChange={(event) => setIndustry(event.target.value)} />
            </Field>
            <Field label="Localização">
              <Input value={location} onChange={(event) => setLocation(event.target.value)} />
            </Field>
          </div>

          <Field label="Notas">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </Field>

          {!business && (
            <fieldset className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Contacto principal opcional</legend>
              <Field label="Nome">
                <Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
              </Field>
              <Field label="Cargo/função">
                <Input value={contactRole} onChange={(event) => setContactRole(event.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
              </Field>
              <Field label="Telefone">
                <Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
              </Field>
            </fieldset>
          )}

          {result && !result.ok && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {result.message}
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            <div>
              {business && (
                <Button type="button" variant="destructive" onClick={archive} disabled={pending}>
                  Arquivar
                </Button>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "A guardar…" : business ? "Guardar alterações" : "Criar cliente"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Label className="flex flex-col items-stretch gap-1.5">
      <span>{label}{required ? " *" : ""}</span>
      {children}
    </Label>
  );
}
