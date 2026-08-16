import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ClinicalEvolutionRow } from "../database/repositories/reportsRepo";
import { getSignatureImageBase64 } from "../utils/signatureImport";
import { getTherapistInfo, buildTherapistFooterHtml } from "./therapistInfo";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(rows: ClinicalEvolutionRow[], title: string, signatureBase64: string | null, therapistFooter: string, diagnosis?: string | null, treatmentGoals?: string | null, logoBase64?: string | null, examImages?: string[]): string {
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
        ${logoBase64 ? `<img src="${logoBase64}" style="max-height:60px; max-width:180px; margin-bottom:8px;" />` : ""}
        <h1>${clinicNames || "Evolução Clínica"}</h1>
        <div class="summary">Evolução Clínica — ${escapeHtml(title)}</div>
        <div class="summary">Total de registros: ${rows.length}</div>
        ${diagnosis ? `<div class="clinicalInfo"><strong>Diagnóstico:</strong> ${escapeHtml(diagnosis)}</div>` : ""}
        ${treatmentGoals ? `<div class="clinicalInfo"><strong>Objetivos e tratamento:</strong> ${escapeHtml(treatmentGoals)}</div>` : ""}
        ${entriesHtml || "<p>Nenhuma evolução registrada neste período.</p>"}
        ${examImages && examImages.length > 0 ? `<div style="margin-top:24px;"><h2 style="font-size:15px;">Exames e documentos</h2>${examImages.map((img) => `<img src="${img}" style="max-width:100%; max-height:400px; margin-bottom:12px; display:block;" />`).join("")}</div>` : ""}
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
  treatmentGoals?: string | null,
  logoBase64?: string | null,
  examImages?: string[]
): Promise<void> {
  const signatureBase64 = await getSignatureImageBase64();
  const therapist = await getTherapistInfo();
  const therapistFooter = buildTherapistFooterHtml(therapist);
  const html = buildHtml(rows, title, signatureBase64, therapistFooter, diagnosis, treatmentGoals, logoBase64, examImages);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar evolução clínica (PDF)",
    });
  }
}

function buildClinicByPatientHtml(rows: ClinicalEvolutionRow[], clinicName: string, logoBase64: string | null, therapistFooter: string): string {
  const byPatient = new Map<string, ClinicalEvolutionRow[]>();
  for (const r of rows) {
    if (!byPatient.has(r.patient_name)) byPatient.set(r.patient_name, []);
    byPatient.get(r.patient_name)!.push(r);
  }

  const pagesHtml = Array.from(byPatient.entries())
    .map(([patientName, patientRows], idx) => {
      const entriesHtml = patientRows
        .map(
          (r) => `
          <div class="entry">
            <div class="entry-header">
              <span class="meta">${r.date} · ${r.time}</span>
            </div>
            <p class="content">${escapeHtml(r.content)}</p>
          </div>`
        )
        .join("");
      return `
        <div class="patient-page" style="${idx > 0 ? "page-break-before: always;" : ""}">
          ${logoBase64 ? `<img src="${logoBase64}" style="max-height:60px; max-width:180px; margin-bottom:8px;" />` : ""}
          <h1>${escapeHtml(clinicName)}</h1>
          <h2 style="font-size:16px; margin:4px 0 12px;">${escapeHtml(patientName)}</h2>
          ${entriesHtml}
        </div>`;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .entry { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #E2E8F0; }
          .meta { font-size: 11px; color: #64748B; }
          .content { font-size: 13px; line-height: 1.5; margin: 0; }
        </style>
      </head>
      <body>
        ${pagesHtml}
        ${therapistFooter}
      </body>
    </html>
  `;
}

export async function exportClinicPatientsEvolutionAsPdf(
  rows: ClinicalEvolutionRow[],
  clinicName: string,
  logoBase64: string | null
): Promise<void> {
  const therapist = await getTherapistInfo();
  const therapistFooter = buildTherapistFooterHtml(therapist);
  const html = buildClinicByPatientHtml(rows, clinicName, logoBase64, therapistFooter);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar evolução por paciente (PDF)",
    });
  }
}
