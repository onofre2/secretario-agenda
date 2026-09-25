import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getReportRows, ReportRow } from "../database/repositories/reportsRepo";
import { getSummary, getRevenueByClinic, getLossByClinic } from "../database/repositories/financialRepo";
import { getTherapistInfo, buildTherapistFooterHtml } from "./therapistInfo";

const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Pendente",
};

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusClass(status: string): string {
  if (status === "present") return "st-present";
  if (status === "absent") return "st-absent";
  return "";
}

export function monthLabelFromKey(key: string): string {
  const [year, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[(m ?? 1) - 1] ?? key} de ${year}`;
}

export async function exportMonthlyReportPdf(monthKey: string): Promise<void> {
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  const [rows, summary, revenueByClinic, lossByClinic, therapist] = await Promise.all([
    getReportRows(start, end),
    getSummary(start, end),
    getRevenueByClinic(start, end) as Promise<{ clinic_name: string; total: number }[]>,
    getLossByClinic(start, end),
    getTherapistInfo(),
  ]);

  const therapistFooter = buildTherapistFooterHtml(therapist);

  const byClinic = new Map<string, ReportRow[]>();
  for (const r of rows) {
    if (!byClinic.has(r.clinic_name)) byClinic.set(r.clinic_name, []);
    byClinic.get(r.clinic_name)!.push(r);
  }

  const revMap = new Map(revenueByClinic.map((c) => [c.clinic_name, c.total]));
  const lossMap = new Map(lossByClinic.map((c) => [c.clinic_name, c.total]));

  const sections = Array.from(byClinic.entries())
    .map(([clinicName, clinicRows]) => {
      const present = clinicRows.filter((r) => r.status === "present").length;
      const absent = clinicRows.filter((r) => r.status === "absent").length;
      const revenue = revMap.get(clinicName) ?? 0;
      const loss = lossMap.get(clinicName) ?? 0;

      const lines = clinicRows
        .map(
          (r) => `
          <tr>
            <td>${r.date}</td>
            <td>${r.time}</td>
            <td>${escapeHtml(r.patient_name)}</td>
            <td class="${statusClass(r.status)}">${STATUS_LABEL[r.status] ?? r.status}</td>
          </tr>`
        )
        .join("");

      return `
        <div class="clinic-block">
          <h2>${escapeHtml(clinicName)}</h2>
          <div class="summary">
            Presencas: <b>${present}</b> &nbsp;|&nbsp; Faltas: <b>${absent}</b> &nbsp;|&nbsp;
            Receita: <b class="st-present">${formatBRL(revenue)}</b> &nbsp;|&nbsp;
            Perda por faltas: <b class="st-absent">${formatBRL(loss)}</b>
          </div>
          <table>
            <thead><tr><th>Data</th><th>Horario</th><th>Paciente</th><th>Status</th></tr></thead>
            <tbody>${lines}</tbody>
          </table>
        </div>`;
    })
    .join("");

  const attendanceRate =
    summary.presentCount + summary.absentCount > 0
      ? Math.round((summary.presentCount / (summary.presentCount + summary.absentCount)) * 100)
      : 0;

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 15px; margin-top: 0; margin-bottom: 6px; }
          .period { color: #6B7280; font-size: 13px; margin-bottom: 16px; }
          .totals { border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; }
          .totals div { margin-bottom: 4px; }
          .clinic-block { margin-bottom: 28px; page-break-inside: avoid; }
          .summary { font-size: 12px; color: #334155; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
          th { background: #F1F5F9; }
          .st-present { color: #16A34A; font-weight: bold; }
          .st-absent { color: #DC2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Relatorio Mensal</h1>
        <div class="period">${escapeHtml(monthLabelFromKey(monthKey))}</div>

        <div class="totals">
          <div><b>Resumo geral do mes</b></div>
          <div>Receita total: <b class="st-present">${formatBRL(summary.revenue)}</b></div>
          <div>Perda por faltas: <b class="st-absent">${formatBRL(summary.loss)}</b></div>
          <div>Atendimentos: <b>${summary.appointmentsCount}</b> (presencas: ${summary.presentCount}, faltas: ${summary.absentCount})</div>
          <div>Taxa de comparecimento: <b>${attendanceRate}%</b></div>
        </div>

        ${sections || "<p>Nenhum atendimento neste mes.</p>"}
        ${therapistFooter}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar relatorio mensal (PDF)",
    });
  }
}
