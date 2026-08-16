import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ClinicalEvolutionRow } from "../database/repositories/reportsRepo";
import { getSignatureImageBase64 } from "../utils/signatureImport";
import { getTherapistInfo, buildTherapistFooterHtml } from "./therapistInfo";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(rows: ClinicalEvolutionRow[], title: string, signatureBase64: string | null, therapistFooter: string, diagnosis?: string | null, treatmentGoals?: string | null): string {
  const clinicNames = Array.from(new Set(rows.map((r) => r.clinic_name))).join(", ");
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
          .clinicalInfo { font-size: 13px; margin-bottom: 8px; color: #334155; }
        </style>
      </head>
      <body>
        <h1>${clinicNames || "Evolução Clínica"}</h1>
        <div class="summary">Evolução Clínica — ${escapeHtml(title)}</div>
        <div class="summary">Total de registros: ${rows.length}</div>
        ${diagnosis ? `<div class="clinicalInfo"><strong>Diagnóstico:</strong> ${escapeHtml(diagnosis)}</div>` : ""}
        ${treatmentGoals ? `<div class="clinicalInfo"><strong>Objetivos e tratamento:</strong> ${escapeHtml(treatmentGoals)}</div>` : ""}
        ${entriesHtml || "<p>Nenhuma evolução registrada neste período.</p>"}
          ${signatureBase64 ? `<div style="margin-top:40px; text-align:center;"><img src="${signatureBase64}" style="max-width:200px; max-height:80px;" /><div style="border-top:1px solid #334155; width:220px; margin:4px auto 0;"></div><div style="font-size:11px; color:#64748B; margin-top:4px;">Assinatura</div></div>` : ""}
          ${therapistFooter}
      </body>
    </html>
  `;
}

export async function exportClinicalEvolutionAsPdf(
  rows: ClinicalEvolutionRow[],
  title: string,
  diagnosis?: string | null,
  treatmentGoals?: string | null
): Promise<void> {
  const signatureBase64 = await getSignatureImageBase64();
  const therapist = await getTherapistInfo();
  const therapistFooter = buildTherapistFooterHtml(therapist);
  const html = buildHtml(rows, title, signatureBase64, therapistFooter, diagnosis, treatmentGoals);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar evolução clínica (PDF)",
    });
  }
}
