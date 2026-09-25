import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ReportRow } from "../database/repositories/reportsRepo";
import { formatCurrency } from "../utils/date";
import { getTherapistInfo, buildTherapistFooterHtml } from "./therapistInfo";

const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Pendente",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHtml(rows: ReportRow[], clinicName: string, monthLabel: string, therapistFooter: string, logoBase64: string | null): string {
  const presentCount = rows.filter((r) => r.status === "present").length;
  const absentCount = rows.filter((r) => r.status === "absent").length;
  const attendanceRate = presentCount + absentCount > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 0;

  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td>${escapeHtml(r.patient_name)}</td>
        <td class="${r.status === "present" ? "st-present" : r.status === "absent" ? "st-absent" : ""}">${STATUS_LABEL[r.status] ?? r.status}</td>
      </tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #1F2937; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { color: #6B7280; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .st-present { color: #16A34A; font-weight: bold; }
          .st-absent { color: #DC2626; font-weight: bold; }
          .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
          .page-header-text { flex: 1; }
          .page-logo { max-height: 130px; max-width: 240px; margin-left: 16px; }
        </style>
      </head>
      <body>
        <div class="page-header">
          <div class="page-header-text">
            <h1>${escapeHtml(clinicName)}</h1>
            <div class="subtitle">Relatório de Presença — ${escapeHtml(monthLabel)}</div>
          </div>
          ${logoBase64 ? `<img class="page-logo" src="${logoBase64}" />` : ""}
        </div>
        <div class="summary-row"><span>Presenças</span><span>${presentCount}</span></div>
        <div class="summary-row"><span>Faltas</span><span>${absentCount}</span></div>
        <div class="summary-row"><span>Taxa de comparecimento</span><span>${attendanceRate}%</span></div>
        <table>
          <thead><tr><th>Data</th><th>Horário</th><th>Paciente</th><th>Status</th></tr></thead>
          <tbody>${rowsHtml || "<tr><td colspan=\"4\">Nenhum atendimento neste período.</td></tr>"}</tbody>
        </table>
        ${therapistFooter}
      </body>
    </html>
  `;
}

export async function exportClinicAttendancePdf(
  rows: ReportRow[],
  clinicName: string,
  monthLabel: string,
  logoBase64: string | null = null
): Promise<void> {
  const therapist = await getTherapistInfo();
  const therapistFooter = buildTherapistFooterHtml(therapist);
  const html = buildHtml(rows, clinicName, monthLabel, therapistFooter, logoBase64);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar presença (PDF)",
    });
  }
}
