import { describe, expect, it } from "vitest";
import { currencyDigits, formatDate, formatHM, formatHMS, formatTime, moneyInputValue, parseDuration, parseMoney } from "./format";
import { dateStrRange, startOfWeek, toDateStr } from "./dates";
import { displayShortcut } from "./shortcut";

describe("money", () => {
  it("uses the currency's minor units", () => {
    expect(currencyDigits("USD")).toBe(2);
    expect(currencyDigits("JPY")).toBe(0);
    expect(currencyDigits("KWD")).toBe(3);
    expect(parseMoney("85.5", "USD")).toBe(8550);
    expect(parseMoney("1,234.56", "EUR")).toBe(123456);
    expect(parseMoney("1200", "JPY")).toBe(1200);
    expect(parseMoney("abc", "USD")).toBeNull();
    expect(moneyInputValue(8550, "USD")).toBe("85.50");
  });
});

describe("durations", () => {
  it("formats and parses", () => {
    expect(formatHM(5400)).toBe("1:30");
    expect(formatHMS(3725)).toBe("1:02:05");
    expect(parseDuration("1:30")).toBe(5400);
    expect(parseDuration("90m")).toBe(5400);
    expect(parseDuration("1h 15m")).toBe(4500);
    expect(parseDuration("1.5")).toBe(5400);
    expect(parseDuration("nope")).toBeNull();
  });
});

describe("dates", () => {
  it("formats with the chosen pattern", () => {
    expect(formatDate("2026-01-05", "DD/MM/YYYY")).toBe("05/01/2026");
    expect(formatDate("2026-01-05", "MMM D, YYYY")).toBe("Jan 5, 2026");
    const d = new Date(2026, 0, 5, 14, 7);
    expect(formatTime(d, "24h")).toBe("14:07");
    expect(formatTime(d, "12h")).toBe("2:07 PM");
  });
  it("computes week starts and inclusive ranges", () => {
    const wed = new Date(2026, 10, 18);
    expect(toDateStr(startOfWeek(wed, 1))).toBe("2026-11-16");
    expect(toDateStr(startOfWeek(wed, 0))).toBe("2026-11-15");
    const r = dateStrRange("2026-11-01", "2026-11-30");
    expect(new Date(r.to).getTime() - new Date(r.from).getTime()).toBeGreaterThanOrEqual(29 * 86400_000);
  });
});

describe("shortcuts", () => {
  it("renders accelerators", () => {
    expect(displayShortcut("")).toBe("");
    expect(displayShortcut("CommandOrControl+Alt+T").length).toBeGreaterThan(0);
  });
});
