// Accelerator strings use Tauri's format, e.g. "CommandOrControl+Alt+T".

export const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform || navigator.userAgent);

const MAC_SYMBOLS: Record<string, string> = {
  CommandOrControl: "⌘",
  Command: "⌘",
  Cmd: "⌘",
  Super: "⌘",
  Control: "⌃",
  Ctrl: "⌃",
  Alt: "⌥",
  Option: "⌥",
  Shift: "⇧",
  Space: "Space",
};

export function displayShortcut(acc: string): string {
  if (!acc) return "";
  const parts = acc.split("+");
  if (isMac) return parts.map((p) => MAC_SYMBOLS[p] ?? p).join("");
  return parts.map((p) => (p === "CommandOrControl" ? "Ctrl" : p)).join("+");
}

const CODE_KEYS: Record<string, string> = {
  Space: "Space",
  Enter: "Enter",
  Backspace: "Backspace",
  Tab: "Tab",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Backslash: "\\",
  Backquote: "`",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

/** Convert a keydown event to an accelerator, or null if it's only modifiers / has none. */
export function eventToAccelerator(e: KeyboardEvent): string | null {
  const code = e.code;
  let key: string | null = null;
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
  else if (/^Digit[0-9]$/.test(code)) key = code.slice(5);
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) key = code;
  else if (CODE_KEYS[code]) key = CODE_KEYS[code];
  if (!key) return null;
  const mods: string[] = [];
  if (e.metaKey || (!isMac && e.ctrlKey)) mods.push("CommandOrControl");
  if (isMac && e.ctrlKey) mods.push("Control");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  // Require at least one non-Shift modifier so normal typing is never captured globally.
  if (!mods.some((m) => m !== "Shift") && !/^F\d+$/.test(key)) return null;
  return [...mods, key].join("+");
}
