import { useState } from "react";
import { api, errorMessage, type ClientInput } from "../lib/api";
import { isValidCurrency } from "../lib/format";
import { displayShortcut } from "../lib/shortcut";
import { useSettingsValue } from "../lib/queries";
import { t } from "../strings";
import { ClientFields, emptyClient } from "../components/forms";
import { ClockIcon } from "../components/icons";
import { CurrencyInput, MoneyInput, PROJECT_COLORS } from "../components/inputs";
import { Button, Field, Input, Textarea, useUi } from "../components/ui";

const STEPS = 4;

/** OB-1/OB-2: first-run flow. Every step except the client can be skipped. */
export function Onboarding() {
  const s = useSettingsValue();
  const ui = useUi();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(s.businessName);
  const [email, setEmail] = useState(s.email);
  const [address, setAddress] = useState(s.address);
  const [currency, setCurrency] = useState(s.defaultCurrency);
  const [rate, setRate] = useState(s.defaultRate);
  const [client, setClient] = useState<ClientInput>(emptyClient(s.defaultCurrency, s.defaultRate));
  const [projectName, setProjectName] = useState<string>(t.clients.defaultProjectName);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      ui.toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveBusiness = () =>
    run(async () => {
      await api.updateSettings({ businessName, email, address });
      setStep(2);
    });

  const saveRates = () =>
    run(async () => {
      if (!isValidCurrency(currency)) throw new Error(t.errors.invalidCurrency);
      await api.updateSettings({ defaultCurrency: currency, defaultRate: rate });
      setClient((c) => ({ ...c, currency, defaultRate: rate }));
      setStep(3);
    });

  const saveClient = () =>
    run(async () => {
      if (!client.name.trim()) throw new Error(t.errors.required(t.clients.name));
      if (!projectName.trim()) throw new Error(t.errors.required(t.clients.projectName));
      if (!isValidCurrency(client.currency)) throw new Error(t.errors.invalidCurrency);
      const c = await api.createClient(client);
      await api.createProject({ clientId: c.id, name: projectName.trim(), rateOverride: null, color: PROJECT_COLORS[0] });
      setStep(4);
    });

  const finish = () => run(async () => void (await api.updateSettings({ onboarded: true })));

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-bg p-8">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-xl">
        {step > 0 && step <= STEPS && <p className="mb-2 text-xs font-medium text-muted">{t.onboarding.step(step, STEPS)}</p>}

        {step === 0 && (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-mint-400 to-mint-700 text-white shadow-lg">
              <ClockIcon size={30} />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">{t.onboarding.welcome}</h1>
            <p className="text-sm text-muted">{t.onboarding.welcomeBody}</p>
            <Button variant="primary" size="lg" onClick={() => setStep(1)} autoFocus>
              {t.onboarding.getStarted}
            </Button>
          </div>
        )}

        {step === 1 && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveBusiness();
            }}
          >
            <div>
              <h2 className="text-lg font-semibold">{t.onboarding.business}</h2>
              <p className="text-sm text-muted">{t.onboarding.businessBody}</p>
            </div>
            <Field label={t.settings.businessName} htmlFor="ob-bn">
              <Input id="ob-bn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoFocus />
            </Field>
            <Field label={t.settings.email} htmlFor="ob-email">
              <Input id="ob-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label={t.settings.address} htmlFor="ob-addr">
              <Textarea id="ob-addr" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                {t.common.skip}
              </Button>
              <Button variant="primary" type="submit" disabled={busy}>
                {t.common.next}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveRates();
            }}
          >
            <div>
              <h2 className="text-lg font-semibold">{t.onboarding.rates}</h2>
              <p className="text-sm text-muted">{t.onboarding.ratesBody}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.settings.defaultCurrency} htmlFor="ob-cur">
                <CurrencyInput id="ob-cur" value={currency} onChange={setCurrency} />
              </Field>
              <Field label={t.settings.defaultRate} htmlFor="ob-rate">
                <MoneyInput id="ob-rate" value={rate} currency={isValidCurrency(currency) ? currency : "USD"} onChange={(v) => setRate(v ?? 0)} />
              </Field>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>
                {t.common.skip}
              </Button>
              <Button variant="primary" type="submit" disabled={busy}>
                {t.common.next}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveClient();
            }}
          >
            <div>
              <h2 className="text-lg font-semibold">{t.onboarding.client}</h2>
              <p className="text-sm text-muted">{t.onboarding.clientBody}</p>
            </div>
            <ClientFields value={client} onChange={setClient} />
            <Field label={t.clients.firstProjectName} htmlFor="ob-proj" hint={t.clients.firstProjectHint}>
              <Input id="ob-proj" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </Field>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                {t.common.back}
              </Button>
              <Button variant="primary" type="submit" disabled={busy}>
                {t.common.next}
              </Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4 text-center">
            <h2 className="text-xl font-semibold">{t.onboarding.done}</h2>
            <p className="text-sm text-muted">{t.onboarding.doneBody}</p>
            <div className="rounded-xl border border-mint-500/30 bg-mint-500/10 px-4 py-3 text-left text-sm">
              <p>{t.onboarding.menuBarHint}</p>
              {s.globalShortcut && (
                <p className="mt-1 text-muted">
                  {t.onboarding.shortcutHint(displayShortcut(s.globalShortcut))}
                </p>
              )}
            </div>
            <Button variant="primary" size="lg" onClick={finish} disabled={busy} autoFocus>
              {t.onboarding.finish}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
