// Invoice and timesheet PDF templates (IN-9, IN-12), rendered on-device.
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import regular from "../../assets/fonts/NotoSans-Regular.ttf?url";
import semibold from "../../assets/fonts/NotoSans-SemiBold.ttf?url";
import bold from "../../assets/fonts/NotoSans-Bold.ttf?url";
import type { ClientSnapshot, Entry, Invoice, InvoiceLine, SenderSnapshot } from "../api";
import { formatDate, formatHM, formatMoney, formatNumber, formatTime, type FormatPrefs } from "../format";
import { t } from "../../strings";

let registered = false;
export function registerFonts(src: { regular: string; semibold: string; bold: string } = { regular, semibold, bold }) {
  if (registered) return;
  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: src.regular, fontWeight: 400 },
      { src: src.semibold, fontWeight: 600 },
      { src: src.bold, fontWeight: 700 },
    ],
  });
  // Long descriptions should wrap at spaces, not mid-word hyphenation.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

const ink = "#1c1c1a";
const muted = "#6b6b66";
const line = "#e4e4df";
const accent = "#047857";

const s = StyleSheet.create({
  page: { fontFamily: "Noto Sans", fontSize: 9.5, color: ink, paddingTop: 44, paddingBottom: 56, paddingHorizontal: 48, lineHeight: 1.4 },
  row: { flexDirection: "row" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  logo: { maxWidth: 140, maxHeight: 56, objectFit: "contain" },
  brand: { fontSize: 15, fontWeight: 700, lineHeight: 1.3 },
  title: { fontSize: 22, fontWeight: 700, color: accent, textAlign: "right", lineHeight: 1.25 },
  number: { fontSize: 10.5, fontWeight: 600, textAlign: "right", marginTop: 4, lineHeight: 1.3 },
  label: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  parties: { flexDirection: "row", gap: 24, marginBottom: 22 },
  party: { flex: 1 },
  partyName: { fontSize: 10.5, fontWeight: 600, marginBottom: 1 },
  meta: { width: 170 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  table: { borderTopWidth: 1, borderTopColor: ink },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: line, paddingVertical: 5 },
  thText: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: line, paddingVertical: 5 },
  cDesc: { flex: 1, paddingRight: 8 },
  cNum: { width: 64, textAlign: "right" },
  cAmt: { width: 84, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 240, marginTop: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: ink, marginTop: 4, paddingTop: 6 },
  grandText: { fontSize: 12, fontWeight: 700 },
  notes: { marginTop: 28, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: line },
  footer: { position: "absolute", bottom: 26, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: muted },
  h2: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  sub: { color: muted, marginBottom: 14 },
  tsDate: { width: 62 },
  tsTime: { width: 44 },
  tsDur: { width: 40, textAlign: "right", paddingRight: 8 },
  tsProj: { width: 92, paddingRight: 6 },
  tsDesc: { flex: 1, paddingRight: 6 },
  tsSrc: { width: 42 },
  small: { fontSize: 8.5 },
  mutedText: { color: muted },
});

function Lines({ text }: { text: string }) {
  return (
    <>
      {text
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map((l, i) => (
          <Text key={i}>{l}</Text>
        ))}
    </>
  );
}

function Footer({ left }: { left: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => t.invoices.page(pageNumber, totalPages)} />
    </View>
  );
}

function SenderBlock({ sender, logo }: { sender: SenderSnapshot; logo: string | null }) {
  return logo ? <Image src={logo} style={s.logo} /> : <Text style={s.brand}>{sender.businessName || " "}</Text>;
}

function PartyBlock({ label, name, lines }: { label: string; name: string; lines: (string | undefined)[] }) {
  return (
    <View style={s.party}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.partyName}>{name}</Text>
      {lines
        .filter((l): l is string => !!l && l.trim() !== "")
        .map((l, i) => (
          <Lines key={i} text={l} />
        ))}
    </View>
  );
}

function TimesheetTable({ entries, prefs, showSource }: { entries: Entry[]; prefs: FormatPrefs; showSource: boolean }) {
  const total = entries.reduce((a, e) => a + e.durationSeconds, 0);
  return (
    <View style={s.table}>
      <View style={s.th} fixed>
        <Text style={[s.thText, s.tsDate]}>{t.common.date}</Text>
        <Text style={[s.thText, s.tsTime]}>{t.common.start}</Text>
        <Text style={[s.thText, s.tsTime]}>{t.common.end}</Text>
        <Text style={[s.thText, s.tsDur]}>{t.invoices.qty}</Text>
        <Text style={[s.thText, s.tsProj]}>{t.common.project}</Text>
        <Text style={[s.thText, s.tsDesc]}>{t.common.description}</Text>
        {showSource && <Text style={[s.thText, s.tsSrc]}>{t.common.source}</Text>}
      </View>
      {entries.map((e) => (
        <View key={e.id} style={[s.tr, s.small]} wrap={false}>
          <Text style={s.tsDate}>{formatDate(new Date(e.startedAt), prefs.dateFormat)}</Text>
          <Text style={s.tsTime}>{formatTime(e.startedAt, prefs.timeFormat)}</Text>
          <Text style={s.tsTime}>{e.endedAt ? formatTime(e.endedAt, prefs.timeFormat) : ""}</Text>
          <Text style={s.tsDur}>{formatHM(e.durationSeconds)}</Text>
          <Text style={s.tsProj}>{e.projectName}</Text>
          <Text style={s.tsDesc}>{e.description || "—"}</Text>
          {showSource && <Text style={[s.tsSrc, s.mutedText]}>{t.entries.source[e.source]}</Text>}
        </View>
      ))}
      <View style={[s.tr, { borderBottomWidth: 0 }]}>
        <Text style={[s.tsDate, { fontWeight: 600 }]}>{t.common.total}</Text>
        <Text style={s.tsTime} />
        <Text style={s.tsTime} />
        <Text style={[s.tsDur, { fontWeight: 600 }]}>{formatHM(total)}</Text>
      </View>
    </View>
  );
}

export interface InvoiceDocProps {
  invoice: Invoice;
  lines: InvoiceLine[];
  entries: Entry[];
  prefs: FormatPrefs;
  logo: string | null;
  showSource: boolean;
}

export function InvoiceDocument({ invoice, lines, entries, prefs, logo, showSource }: InvoiceDocProps) {
  const sender = invoice.senderSnapshot;
  const client = invoice.clientSnapshot;
  const money = (n: number) => formatMoney(n, invoice.currency, prefs);
  const period =
    invoice.periodStart && invoice.periodEnd
      ? `${formatDate(invoice.periodStart, prefs.dateFormat)} – ${formatDate(invoice.periodEnd, prefs.dateFormat)}`
      : null;
  const footerLeft = `${sender.businessName ? sender.businessName + " · " : ""}${t.invoices.invoice} ${invoice.number}`;
  return (
    <Document title={`${t.invoices.invoice} ${invoice.number}`} author={sender.businessName} creator="Hourmint" producer="Hourmint">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <SenderBlock sender={sender} logo={logo} />
          <View>
            <Text style={s.title}>{t.invoices.invoice.toUpperCase()}</Text>
            <Text style={s.number}>{invoice.number}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <PartyBlock
            label={t.invoices.from}
            name={sender.businessName}
            lines={[sender.address, sender.email, sender.phone, sender.taxId ? `${t.invoices.taxId}: ${sender.taxId}` : undefined]}
          />
          <PartyBlock label={t.invoices.billTo} name={client.name} lines={[client.contactName, client.billingAddress, client.email]} />
          <View style={s.meta}>
            <View style={s.metaRow}>
              <Text style={s.mutedText}>{t.invoices.issueDate}</Text>
              <Text>{formatDate(invoice.issueDate, prefs.dateFormat)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.mutedText}>{t.invoices.dueDate}</Text>
              <Text style={{ fontWeight: 600 }}>{formatDate(invoice.dueDate, prefs.dateFormat)}</Text>
            </View>
            {period && (
              <View style={s.metaRow}>
                <Text style={s.mutedText}>{t.invoices.period}</Text>
                <Text>{period}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={[s.thText, s.cDesc]}>{t.invoices.lineDescription}</Text>
            <Text style={[s.thText, s.cNum]}>{t.invoices.qty}</Text>
            <Text style={[s.thText, s.cAmt]}>{t.common.rate}</Text>
            <Text style={[s.thText, s.cAmt]}>{t.common.amount}</Text>
          </View>
          {lines.map((l) => (
            <View key={l.id || l.position} style={s.tr} wrap={false}>
              <Text style={s.cDesc}>{l.description}</Text>
              <Text style={s.cNum}>{formatHM(l.quantitySeconds)}</Text>
              <Text style={s.cAmt}>{money(l.rate)}</Text>
              <Text style={s.cAmt}>{money(l.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={s.mutedText}>{t.invoices.subtotal}</Text>
            <Text>{money(invoice.subtotal)}</Text>
          </View>
          {invoice.discountAmount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.mutedText}>
                {t.invoices.discount}
                {invoice.discountType === "percent" ? ` (${formatNumber(invoice.discountValue, prefs, 3)}%)` : ""}
              </Text>
              <Text>−{money(invoice.discountAmount)}</Text>
            </View>
          )}
          {invoice.taxRate > 0 && (
            <View style={s.totalRow}>
              <Text style={s.mutedText}>
                {invoice.taxLabel || t.invoices.tax} ({formatNumber(invoice.taxRate, prefs, 3)}%)
              </Text>
              <Text>{money(invoice.taxAmount)}</Text>
            </View>
          )}
          <View style={s.grand}>
            <Text style={s.grandText}>{t.invoices.totalDue}</Text>
            <Text style={s.grandText}>{money(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes.trim() !== "" && (
          <View style={s.notes} wrap={false}>
            <Text style={s.label}>{t.common.notes}</Text>
            <Lines text={invoice.notes} />
          </View>
        )}
        <Footer left={footerLeft} />
      </Page>

      {invoice.includeTimesheet && entries.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.h2}>{t.invoices.timesheet}</Text>
          <Text style={s.sub}>
            {t.invoices.invoice} {invoice.number} · {client.name}
            {period ? ` · ${period}` : ""}
          </Text>
          <TimesheetTable entries={entries} prefs={prefs} showSource={showSource} />
          <Footer left={footerLeft} />
        </Page>
      )}
    </Document>
  );
}

export function TimesheetDocument({
  sender,
  client,
  entries,
  periodLabel,
  prefs,
  logo,
  showSource,
}: {
  sender: SenderSnapshot;
  client: ClientSnapshot;
  entries: Entry[];
  periodLabel: string;
  prefs: FormatPrefs;
  logo: string | null;
  showSource: boolean;
}) {
  const footerLeft = `${sender.businessName ? sender.businessName + " · " : ""}${t.invoices.timesheet}`;
  return (
    <Document title={`${t.invoices.timesheet} ${client.name} ${periodLabel}`} author={sender.businessName} creator="Hourmint" producer="Hourmint">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <SenderBlock sender={sender} logo={logo} />
          <View>
            <Text style={s.title}>{t.invoices.timesheet.toUpperCase()}</Text>
            <Text style={s.number}>{periodLabel}</Text>
          </View>
        </View>
        <View style={s.parties}>
          <PartyBlock label={t.invoices.from} name={sender.businessName} lines={[sender.email]} />
          <PartyBlock label={t.common.client} name={client.name} lines={[client.contactName, client.email]} />
        </View>
        <TimesheetTable entries={entries} prefs={prefs} showSource={showSource} />
        <Footer left={footerLeft} />
      </Page>
    </Document>
  );
}
