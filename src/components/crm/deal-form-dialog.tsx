"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  createOpportunityAction,
  deleteDealAction,
  updateDealAction,
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DEAL_STAGE_LABELS } from "@/lib/constants/labels";
import { DEAL_STAGES } from "@/lib/validation/deal";
import type { Business, DealStage, User } from "@/types";
import type { ContactRow, DealRow } from "@/lib/data/supabase/operational";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businesses: Business[];
  contacts: ContactRow[];
  users: User[];
  deal?: DealRow;
  onSuccess?: (message: string) => void;
}

function emptyToNull(value: string): string | null {
  return value.trim() || null;
}

export function DealFormDialog({ open, onOpenChange, businesses, contacts, users, deal, onSuccess }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CrmActionResult | null>(null);
  const [businessMode, setBusinessMode] = useState<"existing" | "new">(deal ? "existing" : businesses.length ? "existing" : "new");
  const [businessId, setBusinessId] = useState(deal?.business_id ?? businesses[0]?.id ?? "");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessIndustry, setNewBusinessIndustry] = useState("");
  const [newBusinessLocation, setNewBusinessLocation] = useState("");
  const [contactId, setContactId] = useState(deal?.contact_id ?? "");
  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [title, setTitle] = useState(deal?.title ?? "");
  const [leadSource, setLeadSource] = useState(deal?.lead_source ?? "");
  const [service, setService] = useState(deal?.interested_service ?? "");
  const [value, setValue] = useState(String(deal?.estimated_value ?? 0));
  const [ownerId, setOwnerId] = useState(deal?.responsible_user_id ?? users[0]?.id ?? "");
  const [stage, setStage] = useState<DealStage>((deal?.stage as DealStage | undefined) ?? "new");
  const [nextAction, setNextAction] = useState(deal?.next_action ?? "");
  const [nextActionDate, setNextActionDate] = useState(deal?.next_action_date ?? "");
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal?.expected_close_date ?? "");
  const [notes, setNotes] = useState(deal?.notes ?? "");

  const availableContacts = useMemo(
    () => contacts.filter((contact) => contact.business_id === businessId),
    [contacts, businessId],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const base = {
        title,
        leadSource,
        interestedService: service,
        estimatedValue: Number(value) || 0,
        responsibleUserId: ownerId,
        stage,
        nextAction,
        nextActionDate: emptyToNull(nextActionDate),
        expectedCloseDate: emptyToNull(expectedCloseDate),
        notes,
      };
      const next = deal
        ? await updateDealAction(deal.id, { ...base, businessId, contactId: emptyToNull(contactId) })
        : businessMode === "existing"
          ? await createOpportunityAction("existing", { ...base, businessId, contactId: emptyToNull(contactId) })
          : await createOpportunityAction("new", {
              ...base,
              business: {
                name: newBusinessName,
                industry: newBusinessIndustry,
                location: newBusinessLocation,
                notes: "",
              },
              contact: newContactName.trim()
                ? {
                    name: newContactName,
                    role: newContactRole,
                    email: newContactEmail,
                    phone: newContactPhone,
                  }
                : null,
            });
      setResult(next);
      if (next.ok) {
        onSuccess?.(next.message);
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  function remove() {
    if (!deal || !window.confirm(`Eliminar a oportunidade “${deal.title}”? Esta ação não pode ser anulada.`)) return;
    startTransition(async () => {
      const next = await deleteDealAction(deal.id);
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{deal ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle>
          <DialogDescription>Guarda a oportunidade e o próximo follow-up no pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {!deal && (
            <Field label="Business">
              <Select value={businessMode} onChange={(event) => setBusinessMode(event.target.value as "existing" | "new")}>
                <option value="existing" disabled={businesses.length === 0}>Selecionar existente</option>
                <option value="new">Criar novo prospect</option>
              </Select>
            </Field>
          )}

          {businessMode === "existing" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa" required>
                <Select value={businessId} onChange={(event) => { setBusinessId(event.target.value); setContactId(""); }} required disabled={Boolean(deal)}>
                  <option value="">Selecionar…</option>
                  {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                </Select>
              </Field>
              <Field label="Contacto">
                <Select value={contactId} onChange={(event) => setContactId(event.target.value)}>
                  <option value="">Sem contacto associado</option>
                  {availableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                </Select>
              </Field>
            </div>
          ) : (
            <fieldset className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Novo Business e contacto</legend>
              <Field label="Empresa" required><Input value={newBusinessName} onChange={(e) => setNewBusinessName(e.target.value)} required /></Field>
              <Field label="Setor"><Input value={newBusinessIndustry} onChange={(e) => setNewBusinessIndustry(e.target.value)} /></Field>
              <Field label="Localização"><Input value={newBusinessLocation} onChange={(e) => setNewBusinessLocation(e.target.value)} /></Field>
              <Field label="Contacto principal"><Input value={newContactName} onChange={(e) => setNewContactName(e.target.value)} /></Field>
              <Field label="Cargo/função"><Input value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} /></Field>
              <Field label="Telefone"><Input value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} /></Field>
            </fieldset>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título" required><Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus /></Field>
            <Field label="Serviço de interesse"><Input value={service} onChange={(e) => setService(e.target.value)} /></Field>
            <Field label="Origem do lead"><Input value={leadSource} onChange={(e) => setLeadSource(e.target.value)} /></Field>
            <Field label="Valor estimado (€)"><Input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
            <Field label="Responsável" required>
              <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required>
                <option value="">Selecionar…</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </Select>
            </Field>
            <Field label="Stage">
              <Select value={stage} onChange={(e) => setStage(e.target.value as DealStage)}>
                {DEAL_STAGES.map((item) => <option key={item} value={item}>{DEAL_STAGE_LABELS[item]}</option>)}
              </Select>
            </Field>
            <Field label="Próxima ação"><Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field>
            <Field label="Data da próxima ação"><Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} /></Field>
            <Field label="Fecho previsto"><Input type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} /></Field>
          </div>
          <Field label="Notas"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></Field>

          {result && !result.ok && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{result.message}</p>}

          <DialogFooter className="sm:justify-between">
            <div>{deal && <Button type="button" variant="destructive" onClick={remove} disabled={pending}>Eliminar</Button>}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button>
              <Button type="submit" disabled={pending || !title.trim() || !ownerId || (businessMode === "existing" ? !businessId : !newBusinessName.trim())}>
                {pending ? "A guardar…" : deal ? "Guardar alterações" : "Criar oportunidade"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <Label className="flex flex-col items-stretch gap-1.5"><span>{label}{required ? " *" : ""}</span>{children}</Label>;
}
