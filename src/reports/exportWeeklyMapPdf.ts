import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { formatCurrency } from "../utils/date";
import { getClinicColor } from "../utils/clinicColors";
import { weekdayLabel } from "../utils/weekdays";

interface ScheduleItem {
  weekday: number;
  time: string;
  patient_name?: string;
  clinic_name?: string;
  session_value: number;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function exportWeeklyMapPdf(
  schedules: ScheduleItem[],
  clinicHours: [string, number][],
  dayRevenue: { label: string; value: number; count: number }[]
): Promise<void> {
  const sorted = [...schedules].sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time));
  const maxHours = Math.max(1, ...clinicHours.map(([, h]) => h));
  const maxRevenue = Math.max(1, ...dayRevenue.map((d) => d.value));

  const rowsHtml = sorted
    .map((s) => {
      const color = getClinicColor(s.clinic_name ?? "?");
      return `
      <tr style="border-left: 4px solid ${color};">
        <td style="padding-left:8px;">${weekdayLabel(s.weekday)}</td>
        <td>${s.time}</td>
        <td>${escapeHtml(s.patient_name ?? "-")}</td>
        <td>${escapeHtml(s.clinic_name ?? "-")}</td>
        <td style="text-align:right;">${formatCurrency(s.session_value)}</td>
      </tr>`;
    })
    .join("");

  const clinicBarsHtml = clinicHours
    .map(([name, hours]) => {
      const color = getClinicColor(name);
      const pct = Math.round((hours / maxHours) * 100);
      return `
      <div style="margin-bottom:8px;">
        <div style="font-size:12px; margin-bottom:2px;">${escapeHtml(name)} — ${hours}h</div>
        <div style="background:#E2E8F0; border-radius:4px; height:10px; width:100%;">
          <div style="background:${color}; border-radius:4px; height:10px; width:${pct}%;"></div>
        </div>
      </div>`;
    })
    .join("");

  const dayBarsHtml = dayRevenue
    .map((d) => {
      const pct = Math.round((d.value / maxRevenue) * 100);
      return `
      <div style="margin-bottom:8px;">
        <div style="font-size:12px; margin-bottom:2px;">${d.label} — ${formatCurrency(d.value)}</div>
        <div style="background:#E2E8F0; border-radius:4px; height:10px; width:100%;">
          <div style="background:#22C55E; border-radius:4px; height:10px; width:${pct}%;"></div>
        </div>
      </div>`;
    })
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Mapa da Agenda Semanal</h1>
        <table>
          <thead><tr><th>Dia</th><th>Horário</th><th>Paciente</th><th>Clínica</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${rowsHtml || "<tr><td colspan=\"5\">Nenhum horário cadastrado.</td></tr>"}</tbody>
        </table>
        <h2>Horas por clínica (semana)</h2>
        ${clinicBarsHtml}
        <h2>Receita por dia da semana</h2>
        ${dayBarsHtml}
      </body>
    </html>
  `;
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar mapa da agenda semanal (PDF)",
    });
  }
}

/**
 * Exporta o mapa semanal no formato de grade visual (colunas por dia da semana),
 * agrupando pacientes por horario. Se clinicFilter for informado, gera o mapa
 * apenas daquela clinica; caso contrario, gera o mapa completo com todas.
 */
export async function exportWeeklyGridMapPdf(
  schedules: ScheduleItem[],
  clinicFilter?: string
): Promise<void> {
  const filtered = clinicFilter
    ? schedules.filter((s) => (s.clinic_name ?? "") === clinicFilter)
    : schedules;

  const weekdays = [1, 2, 3, 4, 5, 6, 0];

  const columnsHtml = weekdays
    .map((wd) => {
      const daySchedules = filtered
        .filter((s) => s.weekday === wd)
        .sort((a, b) => a.time.localeCompare(b.time));

      if (daySchedules.length === 0) return "";

      const byTime = new Map<string, ScheduleItem[]>();
      for (const s of daySchedules) {
        if (!byTime.has(s.time)) byTime.set(s.time, []);
        byTime.get(s.time)!.push(s);
      }

      const slotsHtml = Array.from(byTime.entries())
        .map(([time, items]) => {
          const color = getClinicColor(items[0].clinic_name ?? "?");
          const names = items.map((i) => escapeHtml(i.patient_name ?? "-")).join(" / ");
          const shortTime = time.replace(":00", "h");
          return `
            <div class="slot">
              <div class="slot-time" style="background:${color};">${shortTime}</div>
              <div class="slot-names">${names}</div>
            </div>`;
        })
        .join("");

      return `
        <div class="day-col">
          <div class="day-title">${weekdayLabel(wd).toUpperCase()}</div>
          ${slotsHtml}
        </div>`;
    })
    .join("");

  const title = clinicFilter ? `AGENDA — ${escapeHtml(clinicFilter)}` : "AGENDA COMPLETA";

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #0F172A; padding: 20px; background: #F8FAFC; }
          h1 { font-size: 20px; text-align: center; margin-bottom: 20px; letter-spacing: 1px; }
          .grid { display: flex; gap: 10px; align-items: flex-start; }
          .day-col { flex: 1; background: #FFFFFF; border-radius: 10px; padding: 10px; border: 1px solid #E2E8F0; }
          .day-title { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 10px; letter-spacing: 0.5px; }
          .slot { display: flex; align-items: stretch; margin-bottom: 8px; border-radius: 6px; overflow: hidden; border: 1px solid #E2E8F0; background: #FFFFFF; }
          .slot-time { color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 8px 6px; display: flex; align-items: center; justify-content: center; min-width: 34px; }
          .slot-names { font-size: 10px; padding: 6px 6px; flex: 1; line-height: 1.3; }
          .empty { text-align: center; color: #64748B; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${columnsHtml ? `<div class="grid">${columnsHtml}</div>` : `<p class="empty">Nenhum horário cadastrado.</p>`}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Exportar mapa da agenda (PDF)",
    });
  }
}
