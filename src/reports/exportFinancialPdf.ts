import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { FinancialSummary, RevenueTrendPoint } from "../database/repositories/financialRepo";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildHtml(
  summary: FinancialSummary,
  byClinic: { clinic_name: string; total: number }[],
  trend: RevenueTrendPoint[],
  rangeLabel: string
): string {
  const attendanceRate =
    summary.presentCount + summary.absentCount > 0
      ? Math.round((summary.presentCount / (summary.presentCount + summary.absentCount)) * 100)
      : 0;

  const clinicRows = byClinic
    .map((c) => `<tr><td>${c.clinic_name}</td><td style="text-align:right">${formatBRL(c.total)}</td></tr>`)
    .join("");

  const trendRows = trend
    .map((t) => `<tr><td>${t.date}</td><td style="text-align:right">${formatBRL(t.revenue)}</td></tr>`)
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; }
          .period { font-size: 13px; color: #334155; margin-bottom: 20px; }
          .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
          .card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; min-width: 140px; }
          .card-label { font-size: 11px; color: #64748B; }
          .card-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; text-align: left; }
          th { background: #F1F5F9; }
        </style>
      </head>
      <body>
        <h1>Secretário Agenda — Relatório Financeiro Geral</h1>
        <div class="period">Período: ${rangeLabel}</div>

        <div class="cards">
          <div class="card"><div class="card-label">Receita</div><div class="card-value">${formatBRL(summary.revenue)}</div></div>
          <div class="card"><div class="card-label">Perda por faltas</div><div class="card-value">${formatBRL(summary.loss)}</div></div>
          <div class="card"><div class="card-label">Atendimentos</div><div class="card-value">${summary.appointmentsCount}</div></div>
          <div class="card"><div class="card-label">Comparecimento</div><div class="card-value">${attendanceRate}%</div></div>
        </div>

        <h2>Receita por clínica</h2>
        <table>
          <thead><tr><th>Clínica</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${clinicRows || "<tr><td colspan='2'>Sem dados neste período.</td></tr>"}</tbody>
        </table>

        <h2>Tendência de receita por dia</h2>
        <table>
          <thead><tr><th>Data</th><th style="text-align:right">Receita</th></tr></thead>
          <tbody>${trendRows || "<tr><td colspan='2'>Sem dados neste período.</td></tr>"}</tbody>
        </table>
      </body>
    </html>
  `;
}

export async function exportFinancialScreenAsPdf(
  summary: FinancialSummary,
  byClinic: { clinic_name: string; total: number }[],
  trend: RevenueTrendPoint[],
  rangeLabel: string
): Promise<void> {
  const html = buildHtml(summary, byClinic, trend, rangeLabel);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar relatório financeiro (PDF)",
    });
  }
}
