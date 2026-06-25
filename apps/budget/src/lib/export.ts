import type { TransactionDto } from "@okes/core";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const amount = (t: TransactionDto) => (t.amountMinor / 100).toFixed(2);
const date = (t: TransactionDto) => new Date(t.occurredAt);

export async function exportCsv(txns: TransactionDto[]): Promise<void> {
  const header = "Date,Type,Description,Amount(GHS),Paid";
  const rows = txns.map((t) =>
    [date(t).toISOString().slice(0, 10), t.direction, `"${t.party.replace(/"/g, '""')}"`, amount(t), t.paid ? "yes" : "no"].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const file = new File(Paths.cache, "okes-transactions.csv");
  try { file.create({ overwrite: true }); } catch { /* already exists */ }
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export transactions" });
  }
}

export async function exportPdf(txns: TransactionDto[]): Promise<void> {
  const body = txns
    .map(
      (t) =>
        `<tr><td>${date(t).toLocaleDateString()}</td><td>${t.party}</td><td style="text-align:right;color:${t.direction === "in" ? "#2e9e6a" : "#c2554a"}">${t.direction === "in" ? "+" : "-"}GHS ${amount(t)}</td></tr>`,
    )
    .join("");
  const html = `<html><head><meta name="viewport" content="width=device-width"/></head>
    <body style="font-family:-apple-system,Roboto,Helvetica,sans-serif;padding:28px;color:#181A21">
      <h1 style="margin:0 0 4px">Okes</h1>
      <p style="color:#6a7080;margin:0 0 20px">Transactions · ${new Date().toLocaleDateString()}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr style="border-bottom:1px solid #ddd;text-align:left;color:#6a7080">
          <th style="padding:8px 0">Date</th><th>Description</th><th style="text-align:right">Amount</th>
        </tr>
        ${body}
      </table>
    </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Export transactions" });
  }
}
