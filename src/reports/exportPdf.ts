import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ReportRow } from "../database/repositories/reportsRepo";
import { formatCurrency } from "../utils/date";

const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Pendente",
};

const CLINIC_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#A855F7", "#14B8A6", "#EF4444", "#84CC16"];

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

function buildHtml(rows: ReportRow[], title: string): string {
  const totalRevenue = rows.filter((r) => r.status === "present").reduce((sum, r) => sum + r.session_value, 0);
  const totalLoss = rows.filter((r) => r.status === "absent").reduce((sum, r) => sum + r.session_value, 0);

  const grouped = groupByClinic(rows);
  let colorIndex = 0;

  const sectionsHtml = Array.from(grouped.entries())
    .map(([clinicName, clinicRows]) => {
      const color = CLINIC_COLORS[colorIndex % CLINIC_COLORS.length];
      colorIndex++;
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
PDF PARTE 1/2 OKcat
