import { useEffect, useState } from "react";
import { api, errorMessage, type Client, type ClientInput, type Project } from "../lib/api";
import { formatMoney, isValidCurrency } from "../lib/format";
import { usePrefs, useSettingsValue } from "../lib/queries";
import { t } from "../strings";
import { ColorPicker, CurrencyInput, MoneyInput, PROJECT_COLORS } from "./inputs";
import { Button, Field, Input, Modal, Textarea, useUi } from "./ui";

export function emptyClient(currency: string, rate: number): ClientInput {
  return { name: "", contactName: "", email: "", billingAddress: "", currency, defaultRate: rate, notes: "" };
}

/** The client fields, shared by the modal and onboarding. */
export function ClientFields({
  value,
  onChange,
  currencyLocked,
}: {
  value: ClientInput;
  onChange: (v: ClientInput) => void;
  currencyLocked?: boolean;
}) {
  const set = <K extends keyof ClientInput>(k: K, v: ClientInput[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t.clients.name} htmlFor="cf-name" className="col-span-2">
        <Input id="cf-name" value={value.name} onChange={(e) => set("name", e.target.value)} autoFocus />
      </Field>
      <Field label={t.clients.contact} htmlFor="cf-contact">
        <Input id="cf-contact" value={value.contactName} onChange={(e) => set("contactName", e.target.value)} />
      </Field>
      <Field label={t.clients.email} htmlFor="cf-email">
        <Input id="cf-email" type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label={t.clients.address} htmlFor="cf-address" className="col-span-2">
        <Textarea id="cf-address" rows={3} value={value.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} />
      </Field>
      <Field
        label={t.common.currency}
        htmlFor="cf-currency"
        hint={currencyLocked ? t.clients.currencyLocked : undefined}
        error={value.currency.length === 3 && !isValidCurrency(value.currency) ? t.errors.invalidCurrency : null}
      >
        <CurrencyInput id="cf-currency" value={value.currency} onChange={(c) => set("currency", c)} disabled={currencyLocked} />
      </Field>
      <Field label={t.clients.defaultRate} htmlFor="cf-rate">
        <MoneyInput
          id="cf-rate"
          value={value.defaultRate}
          currency={isValidCurrency(value.currency) ? value.currency : "USD"}
          onChange={(v) => set("defaultRate", v ?? 0)}
        />
      </Field>
      <Field label={t.common.notes} htmlFor="cf-notes" className="col-span-2">
        <Textarea id="cf-notes" rows={2} value={value.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </div>
  );
}

export function ClientFormModal({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  onSaved?: (c: Client) => void;
}) {
  const settings = useSettingsValue();
  const ui = useUi();
  const [value, setValue] = useState<ClientInput>(emptyClient(settings.defaultCurrency, settings.defaultRate));
  const [projectName, setProjectName] = useState<string>(t.clients.defaultProjectName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(
      client
        ? {
            name: client.name,
            contactName: client.contactName,
            email: client.email,
            billingAddress: client.billingAddress,
            currency: client.currency,
            defaultRate: client.defaultRate,
            notes: client.notes,
          }
        : emptyClient(settings.defaultCurrency, settings.defaultRate),
    );
    setProjectName(t.clients.defaultProjectName);
  }, [open, client, settings.defaultCurrency, settings.defaultRate]);

  const save = async () => {
    if (!value.name.trim()) return ui.toast(t.errors.required(t.clients.name), "error");
    if (!isValidCurrency(value.currency)) return ui.toast(t.errors.invalidCurrency, "error");
    setSaving(true);
    try {
      const saved = client ? await api.updateClient(client.id, value) : await api.createClient(value);
      if (!client && projectName.trim()) {
        await api.createProject({ clientId: saved.id, name: projectName.trim(), rateOverride: null, color: PROJECT_COLORS[0] });
      }
      onSaved?.(saved);
      onClose();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? t.clients.edit : t.clients.add}
      width={540}
      footer={
        <>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-3"
      >
        <ClientFields value={value} onChange={setValue} currencyLocked={false} />
        {!client && (
          <Field label={t.clients.firstProjectName} htmlFor="cf-project" hint={t.clients.firstProjectHint}>
            <Input id="cf-project" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </Field>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export function ProjectFormModal({
  open,
  onClose,
  client,
  project,
}: {
  open: boolean;
  onClose: () => void;
  client: Client;
  project?: Project | null;
}) {
  const ui = useUi();
  const prefs = usePrefs();
  const [name, setName] = useState("");
  const [rate, setRate] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(PROJECT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setRate(project?.rateOverride ?? null);
    setColor(project?.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
  }, [open, project]);

  const save = async () => {
    if (!name.trim()) return ui.toast(t.errors.required(t.clients.projectName), "error");
    setSaving(true);
    try {
      const input = { clientId: client.id, name, rateOverride: rate, color };
      if (project) await api.updateProject(project.id, input);
      else await api.createProject(input);
      onClose();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? t.clients.editProject : t.clients.addProject}
      width={420}
      footer={
        <>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={t.clients.projectName} htmlFor="pf-name">
          <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field
          label={
            <>
              {t.clients.rateOverride} <span className="font-normal text-muted">({t.common.optional})</span>
            </>
          }
          htmlFor="pf-rate"
          hint={t.clients.rateOverrideHint(formatMoney(client.defaultRate, client.currency, prefs))}
        >
          <MoneyInput id="pf-rate" value={rate} currency={client.currency} onChange={setRate} allowEmpty placeholder="" />
        </Field>
        <Field label={t.clients.color}>
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
