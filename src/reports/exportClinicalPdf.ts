import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ClinicalEvolutionRow } from "../database/repositories/reportsRepo";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(rows: ClinicalEvolutionRow[], title: string): string {
  const entriesHtml = rows
    .map(
      (r) => `
      <div class="entry">
        <div class="entry-header">
          <span class="patient">${escapeHtml(r.patient_name)}</span>
          <span class="meta">${r.date} · ${r.time} · ${escapeHtml(r.clinic_name)}</span>
        </div>
        <p class="content">${escapeHtml(r.content)}</p>
      </div>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .summary { margin-bottom: 20px; font-size: 13px; color: #334155; }
          .entry { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #E2E8F0; }
          .entry-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .patient { font-weight: bold; font-size: 14px; }
          .meta { font-size: 11px; color: #64748B; }
          .content { font-size: 13px; line-height: 1.5; margin: 0; }
        </style>
      </head>
      <body>
        <h1>Secretário Agenda — Evolução Clínica ${escapeHtml(title)}</h1>
        <div class="summary">Total de registros: ${rows.length}</div>
        ${entriesHtml || "<p>Nenhuma evolução registrada neste período.</p>"}
      </body>
    </html>
  `;
}

export async function exportClinicalEvolutionAsPdf(
  rows: ClinicalEvolutionRow[],
  title: string
): Promise<void> {
  const html = buildHtml(rows, title);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar evolução clínica (PDF)",
    });
  }
}
