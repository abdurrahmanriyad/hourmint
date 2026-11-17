// Renders the invoice PDF template in Node to make sure it produces a valid file.
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, registerFonts } from "../lib/pdf/documents";
import type { Entry, Invoice } from "../lib/api";

const font = (f: string) => resolve(__dirname, "../assets/fonts", f);

describe("invoice pdf", () => {
  it("renders invoice + timesheet with a non-Latin currency", async () => {
    registerFonts({ regular: font("NotoSans-Regular.ttf"), semibold: font("NotoSans-SemiBold.ttf"), bold: font("NotoSans-Bold.ttf") });
    const invoice = {
      id: "i1", clientId: "c1", clientName: "Acme", number: "INV-2026-0001", status: "draft", issueDate: "2026-11-01",
      dueDate: "2026-11-15", periodStart: "2026-10-01", periodEnd: "2026-10-31", currency: "INR", grouping: "entry",
      roundingMinutes: 15, subtotal: 1500000, discountType: "percent", discountValue: 10, discountAmount: 150000,
      taxLabel: "GST", taxRate: 18, taxAmount: 243000, total: 1593000, notes: "Bank: XYZ\nIBAN: 123", includeTimesheet: true,
      senderSnapshot: { businessName: "Riverside Studio", address: "1 Main St\nCity", email: "a@b.c", phone: "", taxId: "GST123", logoPath: null },
      clientSnapshot: { name: "Acme", contactName: "Jo", email: "jo@acme.test", billingAddress: "2 Road" },
      sentAt: null, paidAt: null, createdAt: "", updatedAt: "", totalSeconds: 5400,
    } as Invoice;
    const entries: Entry[] = Array.from({ length: 60 }, (_, i) => ({
      id: `e${i}`, projectId: "p1", projectName: "Website", projectColor: null, clientId: "c1", clientName: "Acme", currency: "INR",
      description: `Task ${i} with a fairly long description that should wrap onto a second line in the timesheet table`,
      startedAt: new Date(2026, 9, 1 + (i % 28), 9).toISOString(), endedAt: new Date(2026, 9, 1 + (i % 28), 10).toISOString(),
      durationSeconds: 3600, billable: true, source: i % 3 === 0 ? "manual" : "timer", invoiceId: "i1",
      invoiceNumber: "INV-2026-0001", invoiceStatus: "draft", rate: 250000,
    }));
    const lines = [{ id: "l1", position: 1, description: "2026-10-01 · Website — Design", quantitySeconds: 5400, rate: 1000000, amount: 1500000 }];
    const buf = await renderToBuffer(
      <InvoiceDocument invoice={invoice} lines={lines} entries={entries}
        prefs={{ dateFormat: "D MMM YYYY", timeFormat: "24h", numberLocale: "en-IN" }} logo={null} showSource />,
    );
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, buf);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    // Invoice page + multi-page timesheet.
    const pages = (buf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(3);
  }, 30_000);
});
