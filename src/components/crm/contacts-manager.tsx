"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import {
  createContactAction,
  deleteContactAction,
  updateContactAction,
  type CrmActionResult,
} from "@/app/actions/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContactRow } from "@/lib/data/supabase/operational";

export function ContactsManager({ businessId, contacts }: { businessId: string; contacts: ContactRow[] }) {
  const [editing, setEditing] = useState<ContactRow | "new" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setEditing("new")}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar contacto
        </Button>
      </div>
      {feedback && <p aria-live="polite" className="text-sm text-muted-foreground">{feedback}</p>}

      {contacts.length === 0 ? (
        <EmptyState title="Sem contactos" description="Ainda não há contactos associados a este negócio." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{contact.name}</p>
                    {contact.is_primary && <Badge variant="secondary">Principal</Badge>}
                  </div>
                  {contact.role && <p className="text-xs text-muted-foreground">{contact.role}</p>}
                  {contact.email && <p className="break-all text-xs text-muted-foreground">{contact.email}</p>}
                  {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(contact)}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Editar {contact.name}</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <ContactDialog
          key={editing === "new" ? "new" : editing.id}
          open
          businessId={businessId}
          contact={editing === "new" ? undefined : editing}
          onOpenChange={(open) => { if (!open) setEditing(null); }}
          onSuccess={setFeedback}
        />
      )}
    </div>
  );
}

function ContactDialog({
  open,
  onOpenChange,
  businessId,
  contact,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  contact?: ContactRow;
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CrmActionResult | null>(null);
  const [name, setName] = useState(contact?.name ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [isPrimary, setIsPrimary] = useState(contact?.is_primary ?? false);

  function finish(next: CrmActionResult) {
    setResult(next);
    if (next.ok) {
      onSuccess(next.message);
      router.refresh();
      onOpenChange(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const input = { businessId, name, role, email, phone, isPrimary };
      finish(contact ? await updateContactAction(contact.id, input) : await createContactAction(input));
    });
  }

  function remove() {
    if (!contact || !window.confirm(`Remover o contacto “${contact.name}”?`)) return;
    startTransition(async () => finish(await deleteContactAction(contact.id, businessId)));
  }

  return (
    <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? "Editar contacto" : "Adicionar contacto"}</DialogTitle>
          <DialogDescription>Os contactos pertencem sempre a este Business.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cargo/função"><Input value={role} onChange={(e) => setRole(e.target.value)} /></Field>
            <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          </div>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            <Star className="h-4 w-4" /> Definir como contacto principal
          </label>
          {result && !result.ok && <p role="alert" className="text-sm text-destructive">{result.message}</p>}
          <DialogFooter className="sm:justify-between">
            <div>{contact && <Button type="button" variant="destructive" onClick={remove} disabled={pending}><Trash2 className="mr-2 h-4 w-4" /> Remover</Button>}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button>
              <Button type="submit" disabled={pending || !name.trim()}>{pending ? "A guardar…" : "Guardar contacto"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="flex flex-col items-stretch gap-1.5"><span>{label}</span>{children}</Label>;
}
