import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  getMonthlyRevenueLast12Months,
  getMonthlyRevenueByClinic,
  getMonthlyAttendanceByClinic,
  MonthlyRevenuePoint,
  MonthlyClinicRevenue,
  MonthlyClinicAttendance,
} from "../database/repositories/financialRepo";
import { calculateMonthOverMonth, calculateProjection } from "../utils/balanceCalc";
import { getSignatureImageBase64 } from "../utils/signatureImport";
import { getTherapistInfo, buildTherapistFooterHtml } from "./therapistInfo";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CONFIDENCE_LABEL: Record<string, string> = { baixa: "baixa", moderada: "moderada", alta: "alta" };

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(yyyymm: string): string {
  const [year, m] = yyyymm.split("-");
  return `${MONTH_NAMES[Number(m) - 1] ?? yyyymm}/${year.slice(2)}`;
}

function buildClinicTableHtml(rows: MonthlyClinicRevenue[]): string {
  const clinicMap = new Map<string, Map<string, number>>();
  const monthsSet = new Set<string>();
  for (const r of rows) {
    monthsSet.add(r.month);
    if (!clinicMap.has(r.clinic_name)) clinicMap.set(r.clinic_name, new Map());
    clinicMap.get(r.clinic_name)!.set(r.month, r.revenue);
  }
  const months = Array.from(monthsSet).sort();
  if (months.length === 0) return "<p>Sem dados suficientes ainda.</p>";

  const headerCols = months.map((m) => `<th style="text-align:right">${monthLabel(m)}</th>`).join("");
  const bodyRows = Array.from(clinicMap.entries())
    .map(([clinicName, byMonth]) => {
      const cols = months.map((m) => `<td style="text-align:right">${formatBRL(byMonth.get(m) ?? 0)}</td>`).join("");
      return `<tr><td>${clinicName}</td>${cols}</tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr><th>Clínica</th>${headerCols}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
}

function buildAttendanceTableHtml(rows: MonthlyClinicAttendance[]): string {
  const byMonth = new Map<string, { present: number; absent: number }>();
  for (const r of rows) {
    if (!byMonth.has(r.month)) byMonth.set(r.month, { present: 0, absent: 0 });
    const entry = byMonth.get(r.month)!;
    entry.present += r.present;
    entry.absent += r.absent;
  }
  const months = Array.from(byMonth.keys()).sort();
  if (months.length === 0) return "<p>Sem dados suficientes ainda.</p>";

  const bodyRows = months
    .map((m) => {
      const { present, absent } = byMonth.get(m)!;
      const total = present + absent;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return `<tr><td>${monthLabel(m)}</td><td style="text-align:right">${present}</td><td style="text-align:right">${absent}</td><td style="text-align:right">${rate}%</td></tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr><th>Mês</th><th style="text-align:right">Presenças</th><th style="text-align:right">Faltas</th><th style="text-align:right">Comparecimento</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
}

function buildMomTableHtml(monthly: MonthlyRevenuePoint[]): string {
  const series = monthly.map((p) => ({ month: p.month, value: p.revenue }));
  const comparisons = calculateMonthOverMonth(series);
  if (comparisons.length === 0) return "<p>Sem dados suficientes ainda.</p>";

  const rows = comparisons
    .map((c) => {
      const changeText = c.changePct === null ? "—" : `${c.changePct > 0 ? "▲" : c.changePct < 0 ? "▼" : "•"} ${Math.abs(c.changePct).toFixed(1)}%`;
      return `<tr><td>${monthLabel(c.month)}</td><td style="text-align:right">${formatBRL(c.value)}</td><td style="text-align:right">${changeText}</td></tr>`;
    })
    .join("");

  return `
    <table>
      <thead><tr><th>Mês</th><th style="text-align:right">Receita</th><th style="text-align:right">Variação</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildProjectionHtml(monthly: MonthlyRevenuePoint[]): string {
  const series = monthly.map((p) => ({ month: p.month, value: p.revenue }));
  const projection = calculateProjection(series);
  if (projection === null) {
    return "<p>É preciso de pelo menos 2 meses de histórico para projetar.</p>";
  }
  return `
    <div class="cards">
      <div class="card">
        <div class="card-label">${monthLabel(projection.nextMonth)} (estimativa)</div>
        <div class="card-value">${formatBRL(projection.estimate)}</div>
        <div class="card-label" style="margin-top:6px;">Faixa: ${formatBRL(projection.low)} – ${formatBRL(projection.high)}</div>
        <div class="card-label" style="margin-top:2px;">Confiabilidade ${CONFIDENCE_LABEL[projection.confidence]}</div>
      </div>
    </div>`;
}

function buildHtml(
  monthly: MonthlyRevenuePoint[],
  byClinic: MonthlyClinicRevenue[],
  attendance: MonthlyClinicAttendance[],
  signatureBase64: string | null,
  therapistFooter: string
): string {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; }
          .period { font-size: 13px; color: #334155; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 6px 8px; border-bottom: 1px solid #E2E8F0; text-align: left; }
          th { background: #F1F5F9; }
          .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
          .card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; min-width: 200px; }
          .card-label { font-size: 11px; color: #64748B; }
          .card-value { font-size: 20px; font-weight: bold; margin-top: 2px; color: #16A34A; }
        </style>
      </head>
      <body>
        <h1>Balanço</h1>
        <div class="period">Comparativo mensal de receita, comparecimento e projeção</div>

        <h2>Receita e variação mês a mês</h2>
        ${buildMomTableHtml(monthly)}

        <h2>Projeção do próximo mês</h2>
        ${buildProjectionHtml(monthly)}

        <h2>Comparativo por clínica</h2>
        ${buildClinicTableHtml(byClinic)}

        <h2>Taxa de comparecimento mensal</h2>
        ${buildAttendanceTableHtml(attendance)}

        ${signatureBase64 ? `<div style="margin-top:40px; text-align:center;"><img src="${signatureBase64}" style="max-width:200px; max-height:80px;" /><div style="border-top:1px solid #334155; width:220px; margin:4px auto 0;"></div><div style="font-size:11px; color:#64748B; margin-top:4px;">Assinatura</div></div>` : ""}
        ${therapistFooter}
      </body>
    </html>
  `;
}

export async function exportBalanceAsPdf(): Promise<void> {
  const [monthly, byClinic, attendance] = await Promise.all([
    getMonthlyRevenueLast12Months(),
    getMonthlyRevenueByClinic(),
    getMonthlyAttendanceByClinic(),
  ]);
  const signatureBase64 = await getSignatureImageBase64();
  const therapist = await getTherapistInfo();
  const therapistFooter = buildTherapistFooterHtml(therapist);
  const html = buildHtml(monthly, byClinic, attendance, signatureBase64, therapistFooter);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar Balanço (PDF)",
    });
  }
}
