// @vitest-environment jsdom
// Confirmation dialog focus (issue #12): dangerous actions open with Cancel focused, so pressing
// Enter straight away cancels instead of deleting. Other confirmations open with Confirm focused.
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { UiProvider, useUi } from "./ui";

afterEach(cleanup);

function openConfirm(danger: boolean) {
  let ask!: ReturnType<typeof useUi>["confirm"];
  function Probe() {
    ask = useUi().confirm;
    return null;
  }
  render(
    <UiProvider>
      <Probe />
    </UiProvider>,
  );
  let result!: Promise<boolean>;
  act(() => {
    result = ask({ title: "Delete entry", confirmLabel: "Delete", danger });
  });
  return result;
}

describe("confirm dialog focus", () => {
  it("focuses Cancel for a dangerous action", () => {
    openConfirm(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("focuses Confirm for a normal action", () => {
    openConfirm(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete" }));
  });

  it("cancels a dangerous action when the focused button is pressed", async () => {
    const result = openConfirm(true);
    act(() => (document.activeElement as HTMLButtonElement).click());
    await expect(result).resolves.toBe(false);
  });
});
