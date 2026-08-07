import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ReportRow } from "../database/repositories/reportsRepo";
import { getSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";
import { getTherapistInfo, buildTherapistFooterHtml } from "./therapistInfo";
import { formatCurrency } from "../utils/date";

const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Pendente",
};

import { getClinicColor } from "../utils/clinicColors";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function groupByClinic(rows: ReportRow[]): Map<string, ReportRow[]> {
  const map = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const key = r.clinic_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

function buildHtml(rows: ReportRow[], title: string, extra: { goal: number | null; investmentPercent: number | null }, therapistFooter: string): string {
  const totalRevenue = rows.filter((r) => r.status === "present").reduce((sum, r) => sum + r.session_value, 0);
  const totalLoss = rows.filter((r) => r.status === "absent").reduce((sum, r) => sum + r.session_value, 0);
  const presentCount = rows.filter((r) => r.status === "present").length;
  const absentCount = rows.filter((r) => r.status === "absent").length;
  const attendanceRate = presentCount + absentCount > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 0;
  const investmentAmount = extra.investmentPercent ? totalRevenue * (extra.investmentPercent / 100) : 0;
  const netAmount = totalRevenue - investmentAmount;
  const goalPct = extra.goal ? Math.min((totalRevenue / extra.goal) * 100, 100) : null;

  const grouped = groupByClinic(rows);

  const sectionsHtml = Array.from(grouped.entries())
    .map(([clinicName, clinicRows]) => {
      const color = getClinicColor(clinicName);
      const clinicRevenue = clinicRows
        .filter((r) => r.status === "present")
        .reduce((sum, r) => sum + r.session_value, 0);

      const rowsHtml = clinicRows
        .map(
          (r) => `
          <tr>
            <td>${r.date}</td>
            <td>${r.time}</td>
            <td>${escapeHtml(r.patient_name)}</td>
            <td>${STATUS_LABEL[r.status] ?? r.status}</td>
            <td style="text-align:right">${formatCurrency(r.session_value)}</td>
          </tr>`
        )
        .join("");

      return `
        <div class="clinic-section">
          <div class="clinic-header" style="border-left: 5px solid ${color};">
            <span class="clinic-name">${escapeHtml(clinicName)}</span>
            <span class="clinic-total">Ganho na clínica: ${formatCurrency(clinicRevenue)}</span>
          </div>
          <table>
            <thead>
              <tr><th>Data</th><th>Horário</th><th>Paciente</th><th>Status</th><th style="text-align:right">Valor</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #1F2937; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { color: #6B7280; margin-bottom: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
        ${sectionsHtml}
        <div class="summary">
          <div class="summary-row"><span>Total recebido</span><span>${formatCurrency(totalRevenue)}</span></div>
          <div class="summary-row"><span>Total em faltas</span><span>${formatCurrency(totalLoss)}</span></div>
          <div class="summary-row summary-total"><span>Saldo geral</span><span>${formatCurrency(totalRevenue - totalLoss)}</span></div>
            <div class="summary-row"><span>Atendimentos</span><span>${presentCount + absentCount}</span></div>
            <div class="summary-row"><span>Comparecimento</span><span>${attendanceRate}%</span></div>
            ${extra.goal ? `<div class="summary-row"><span>Meta financeira (${Math.round(goalPct ?? 0)}%)</span><span>${formatCurrency(extra.goal)}</span></div>` : ""}
            ${extra.investmentPercent ? `<div class="summary-row"><span>Reserva financeira (${extra.investmentPercent}%)</span><span>${formatCurrency(investmentAmount)}</span></div>` : ""}
            ${extra.investmentPercent ? `<div class="summary-row summary-total"><span>Ganho profissional líquido</span><span>${formatCurrency(netAmount)}</span></div>` : ""}
        </div>
          ${therapistFooter}
      </body>
    </html>`;
}

export async function exportReportPdf(rows: ReportRow[], title: string): Promise<void> {
  const goalStr = await getSetting(SETTINGS_KEYS.MONTHLY_GOAL);
  const investStr = await getSetting(SETTINGS_KEYS.INVESTMENT_PERCENT);
  const therapist = await getTherapistInfo();
  const therapistFooter = buildTherapistFooterHtml(therapist);
  const html = buildHtml(rows, title, { goal: goalStr ? Number(goalStr) : null, investmentPercent: investStr ? Number(investStr) : null }, therapistFooter);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: title,
    });
  }
}
