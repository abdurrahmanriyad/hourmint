import { useEffect, useId, useMemo, useState } from "react";
import type { Project } from "../lib/api";
import { currencyDigits, moneyInputValue, parseMoney } from "../lib/format";
import { useProjects } from "../lib/queries";
import { t } from "../strings";
import { Input, Select, cx } from "./ui";

/** Project picker grouped by client (native select → full keyboard support). */
export function ProjectPicker({
  value,
  onChange,
  id,
  includeProject,
  className,
  autoFocus,
  ariaLabel,
}: {
  value: string;
  onChange: (projectId: string, project: Project | undefined) => void;
  id?: string;
  /** Keep an archived project visible (e.g. when editing an old entry). */
  includeProject?: Project | { id: string; name: string; clientName: string } | null;
  className?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  const { data: projects = [] } = useProjects(null, false);
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; items: Project[] }>();
    for (const p of projects) {
      const g = m.get(p.clientId) ?? { name: p.clientName, items: [] };
      g.items.push(p);
      m.set(p.clientId, g);
    }
    return [...m.values()];
  }, [projects]);
  const missing = includeProject && !projects.some((p) => p.id === includeProject.id);
  return (
    <Select
      id={id}
      value={value}
      autoFocus={autoFocus}
      aria-label={ariaLabel ?? t.common.project}
      className={className}
      onChange={(e) =>
        onChange(
          e.target.value,
          projects.find((p) => p.id === e.target.value),
        )
      }
    >
      <option value="" disabled>
        {t.timer.pickProject}
      </option>
      {missing && (
        <option value={includeProject!.id}>
          {includeProject!.clientName} · {includeProject!.name} ({t.common.archived})
        </option>
      )}
      {groups.map((g) => (
        <optgroup key={g.name} label={g.name}>
          {g.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

/** Amount in minor units; edits as plain text, commits on blur. */
export function MoneyInput({
  value,
  currency,
  onChange,
  id,
  placeholder,
  allowEmpty,
  className,
}: {
  value: number | null;
  currency: string;
  onChange: (minor: number | null) => void;
  id?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(value === null ? "" : moneyInputValue(value, currency));
  useEffect(() => {
    setText(value === null ? "" : moneyInputValue(value, currency));
  }, [value, currency]);
  const commit = () => {
    if (text.trim() === "" && allowEmpty) return onChange(null);
    const minor = parseMoney(text, currency);
    if (minor === null || minor < 0) {
      setText(value === null ? "" : moneyInputValue(value, currency));
      return;
    }
    onChange(minor);
    setText(moneyInputValue(minor, currency));
  };
  return (
    <div className={cx("relative", className)}>
      <Input
        id={id}
        inputMode="decimal"
        value={text}
        placeholder={placeholder ?? (0).toFixed(currencyDigits(currency))}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="pr-12 tabular"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">
        {currency}
      </span>
    </div>
  );
}

const FALLBACK_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "INR", "PKR", "AED", "SAR", "SEK", "NOK", "DKK", "NZD", "SGD", "ZAR", "BRL", "MXN", "PLN", "TRY"];

export function allCurrencies(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (fn) return fn("currency");
  } catch {
    /* fall through */
  }
  return FALLBACK_CURRENCIES;
}

export function CurrencyInput({
  value,
  onChange,
  id,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const codes = useMemo(allCurrencies, []);
  const names = useMemo(() => {
    try {
      return new Intl.DisplayNames(undefined, { type: "currency" });
    } catch {
      return null;
    }
  }, []);
  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        disabled={disabled}
        maxLength={3}
        autoCapitalize="characters"
        spellCheck={false}
        className="uppercase tabular"
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
      />
      <datalist id={listId}>
        {codes.map((c) => (
          <option key={c} value={c}>
            {names?.of(c) ?? c}
          </option>
        ))}
      </datalist>
    </>
  );
}

export const PROJECT_COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
  "#84cc16",
  "#64748b",
];

export function ColorPicker({ value, onChange }: { value: string | null; onChange: (c: string | null) => void }) {
  return (
    <div role="radiogroup" aria-label={t.clients.color} className="flex flex-wrap gap-1.5">
      {PROJECT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cx(
            "h-6 w-6 rounded-full border-2 transition",
            value === c ? "border-text scale-110" : "border-transparent",
          )}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
