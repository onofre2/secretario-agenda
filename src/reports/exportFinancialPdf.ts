import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { FinancialSummary, RevenueTrendPoint, MonthlyRevenuePoint, getMonthlyRevenueLast12Months, ClinicAttendanceStats, getAttendanceByClinic } from "../database/repositories/financialRepo";
import { getSignatureImageBase64 } from "../utils/signatureImport";
import { getTherapistInfo, buildTherapistFooterHtml } from "./therapistInfo";

const CLINIC_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#A855F7", "#14B8A6", "#EF4444", "#84CC16"];
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(yyyymm: string): string {
  const [, m] = yyyymm.split("-");
  return MONTH_NAMES[Number(m) - 1] ?? yyyymm;
}

function buildClinicBarsHtml(byClinic: { clinic_name: string; total: number }[]): string {
  const max = Math.max(...byClinic.map((c) => c.total), 1);
  return byClinic
    .map((c, i) => {
      const color = CLINIC_COLORS[i % CLINIC_COLORS.length];
      const pct = Math.round((c.total / max) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label">${c.clinic_name}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color};"></div></div>
          <div class="bar-value">${formatBRL(c.total)}</div>
        </div>`;
    })
    .join("");
}

function buildMonthlyBarsHtml(monthly: MonthlyRevenuePoint[]): string {
  if (monthly.length === 0) return "<p>Sem dados suficientes ainda.</p>";
  const max = Math.max(...monthly.map((m) => m.revenue), 1);
  const bars = monthly
    .map((m) => {
      const pct = Math.round((m.revenue / max) * 100);
      return `
        <div class="mbar-col">
          <div class="mbar-track"><div class="mbar-fill" style="height:${pct}%;"></div></div>
          <div class="mbar-label">${monthLabel(m.month)}</div>
        </div>`;
    })
    .join("");
  return `<div class="mbar-chart">${bars}</div>`;
}

function computeMonthlyStats(monthly: MonthlyRevenuePoint[]) {
  if (monthly.length === 0) return null;
  const best = monthly.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  const worst = monthly.reduce((a, b) => (b.revenue < a.revenue ? b : a));
  const avg = monthly.reduce((sum, m) => sum + m.revenue, 0) / monthly.length;
  return { best, worst, avg };
}

function buildHtml(
  summary: FinancialSummary,
  byClinic: { clinic_name: string; total: number }[],
  trend: RevenueTrendPoint[],
  monthly: MonthlyRevenuePoint[],
  attendance: ClinicAttendanceStats[],
  rangeLabel: string,
  signatureBase64: string | null,
  therapistFooter: string
): string {
  const clinicNames = byClinic.map((c) => c.clinic_name).join(", ");
  const attendanceRate =
    summary.presentCount + summary.absentCount > 0
      ? Math.round((summary.presentCount / (summary.presentCount + summary.absentCount)) * 100)
      : 0;

  const trendRows = trend
    .map((t) => `<tr><td>${t.date}</td><td style="text-align:right">${formatBRL(t.revenue)}</td></tr>`)
    .join("");

  const clinicBarsHtml = buildClinicBarsHtml(byClinic);
  const monthlyBarsHtml = buildMonthlyBarsHtml(monthly);
  const stats = computeMonthlyStats(monthly);

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
          .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
          .bar-label { width: 130px; font-size: 12px; color: #334155; }
          .bar-track { flex: 1; height: 10px; background: #F1F5F9; border-radius: 5px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 5px; }
          .bar-value { width: 90px; text-align: right; font-size: 12px; font-weight: bold; }
          .mbar-chart { display: flex; align-items: flex-end; height: 120px; gap: 6px; margin-top: 8px; }
          .mbar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
          .mbar-track { width: 70%; height: 100px; background: #F1F5F9; border-radius: 4px; display: flex; align-items: flex-end; overflow: hidden; }
          .mbar-fill { width: 100%; background: #22C55E; border-radius: 4px; }
          .mbar-label { font-size: 9px; color: #64748B; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>${clinicNames || "Relatório Financeiro Geral"}</h1>
        <div class="period">Relatório Financeiro Geral</div>
        <div class="period">Período: ${rangeLabel}</div>

        <div class="cards">
          <div class="card"><div class="card-label">Receita</div><div class="card-value">${formatBRL(summary.revenue)}</div></div>
          <div class="card"><div class="card-label">Perda por faltas</div><div class="card-value">${formatBRL(summary.loss)}</div></div>
          <div class="card"><div class="card-label">Atendimentos</div><div class="card-value">${summary.appointmentsCount}</div></div>
          <div class="card"><div class="card-label">Comparecimento</div><div class="card-value">${attendanceRate}%</div></div>
        </div>

        ${stats ? `
        <h2>Panorama anual</h2>
        <div class="cards">
          <div class="card"><div class="card-label">Melhor mês (${monthLabel(stats.best.month)})</div><div class="card-value">${formatBRL(stats.best.revenue)}</div></div>
          <div class="card"><div class="card-label">Pior mês (${monthLabel(stats.worst.month)})</div><div class="card-value">${formatBRL(stats.worst.revenue)}</div></div>
          <div class="card"><div class="card-label">Ganho médio mensal</div><div class="card-value">${formatBRL(stats.avg)}</div></div>
        </div>
        ${monthlyBarsHtml}
        ` : ""}

        <h2>Receita por clínica</h2>
        ${byClinic.length > 0 ? clinicBarsHtml : "<p>Sem dados neste período.</p>"}

        <h2>Presencas e faltas por clinica</h2>
        <table>
          <thead><tr><th>Clinica</th><th style="text-align:right">Presencas</th><th style="text-align:right">Faltas</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${attendance.length > 0 ? attendance.map(a => `<tr><td>${a.clinic_name}</td><td style="text-align:right">${a.present}</td><td style="text-align:right">${a.absent}</td><td style="text-align:right">${a.present + a.absent}</td></tr>`).join("") : "<tr><td colspan=4>Sem dados neste periodo.</td></tr>"}</tbody>
        </table>

        <h2>Tendência de receita por dia</h2>
        <table>
          <thead><tr><th>Data</th><th style="text-align:right">Receita</th></tr></thead>
          <tbody>${trendRows || "<tr><td colspan='2'>Sem dados neste período.</td></tr>"}</tbody>
        </table>
          ${signatureBase64 ? `<div style="margin-top:40px; text-align:center;"><img src="${signatureBase64}" style="max-width:200px; max-height:80px;" /><div style="border-top:1px solid #334155; width:220px; margin:4px auto 0;"></div><div style="font-size:11px; color:#64748B; margin-top:4px;">Assinatura</div></div>` : ""}
          ${therapistFooter}
      </body>
    </html>
  `;
}

export async function exportFinancialScreenAsPdf(
  summary: FinancialSummary,
  byClinic: { clinic_name: string; total: number }[],
  trend: RevenueTrendPoint[],
  rangeLabel: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const monthly = await getMonthlyRevenueLast12Months();
  const attendance = await getAttendanceByClinic(startDate, endDate);
  const signatureBase64 = await getSignatureImageBase64();
  const therapist = await getTherapistInfo();
  const therapistFooter = buildTherapistFooterHtml(therapist);
  const html = buildHtml(summary, byClinic, trend, monthly, attendance, rangeLabel, signatureBase64, therapistFooter);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar relatório financeiro (PDF)",
    });
  }
}
