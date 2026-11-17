import { createElement } from "react";
import { api, type ClientSnapshot, type Entry, type InvoiceDetail, type SenderSnapshot } from "../api";
import type { FormatPrefs } from "../format";

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadLogo(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    return await api.readLogo(path);
  } catch {
    return null;
  }
}

function safeName(s: string): string {
  return s.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** Render the invoice to PDF and ask where to save it. Returns the saved path or null if cancelled. */
export async function exportInvoicePdf(detail: InvoiceDetail, prefs: FormatPrefs, showSource: boolean): Promise<string | null> {
  // Loaded lazily: the PDF renderer is large and only needed here.
  const [{ pdf }, docs] = await Promise.all([import("@react-pdf/renderer"), import("./documents")]);
  docs.registerFonts();
  const logo = await loadLogo(detail.invoice.senderSnapshot?.logoPath);
  const element = createElement(docs.InvoiceDocument, {
    invoice: detail.invoice,
    lines: detail.lines,
    entries: detail.entries,
    prefs,
    logo,
    showSource,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();
  const name = `${safeName(detail.invoice.number)}-${safeName(detail.invoice.clientName)}.pdf`;
  return api.saveFile(name, "PDF", "pdf", await blobToBase64(blob));
}

export async function exportTimesheetPdf(opts: {
  sender: SenderSnapshot;
  client: ClientSnapshot;
  entries: Entry[];
  periodLabel: string;
  fileStem: string;
  prefs: FormatPrefs;
  showSource: boolean;
}): Promise<string | null> {
  const [{ pdf }, docs] = await Promise.all([import("@react-pdf/renderer"), import("./documents")]);
  docs.registerFonts();
  const logo = await loadLogo(opts.sender.logoPath);
  const element = createElement(docs.TimesheetDocument, { ...opts, logo });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();
  return api.saveFile(`${safeName(opts.fileStem)}.pdf`, "PDF", "pdf", await blobToBase64(blob));
}
