import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ReportRow } from "../database/repositories/reportsRepo";
import { formatCurrency } from "../utils/date";

const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Pendente",
};

function buildHtml(rows: ReportRow[], title: string): string {
  const totalRevenue = rows
    .filter((r) => r.status === "present")
    .reduce((sum, r) => sum + r.session_value, 0);
  const totalLoss = rows
    .filter((r) => r.status === "absent")
    .reduce((sum, r) => sum + r.session_value, 0);

  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td>${escapeHtml(r.patient_name)}</td>
        <td>${escapeHtml(r.clinic_name)}</td>
        <td>${STATUS_LABEL[r.status] ?? r.status}</td>
        <td style="text-align:right">${formatCurrency(r.session_value)}</td>
      </tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .summary { margin-bottom: 16px; font-size: 13px; color: #334155; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; text-align: left; }
          th { background: #F1F5F9; }
        </style>
      </head>
      <body>
        <h1>Secretário Agenda — Relatório ${escapeHtml(title)}</h1>
        <div class="summary">
          Receita: ${formatCurrency(totalRevenue)} &nbsp;|&nbsp;
          Perda por faltas: ${formatCurrency(totalLoss)} &nbsp;|&nbsp;
          Total de atendimentos: ${rows.length}
        </div>
        <table>
          <thead>
            <tr><th>Data</th><th>Horário</th><th>Paciente</th><th>Clínica</th><th>Status</th><th>Valor</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function exportReportAsPdf(rows: ReportRow[], title: string): Promise<void> {
  const html = buildHtml(rows, title);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Exportar relatório (PDF)" });
  }
}
