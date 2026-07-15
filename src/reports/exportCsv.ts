import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ReportRow } from "../database/repositories/reportsRepo";

const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Pendente",
};

function buildCsv(rows: ReportRow[]): string {
  const header = "Data,Horário,Paciente,Clínica,Status,Valor\n";
  const lines = rows.map((r) =>
    [
      r.date,
      r.time,
      `"${r.patient_name.replace(/"/g, '""')}"`,
      `"${r.clinic_name.replace(/"/g, '""')}"`,
      STATUS_LABEL[r.status] ?? r.status,
      r.session_value.toFixed(2).replace(".", ","),
    ].join(",")
  );
  return header + lines.join("\n");
}

export async function exportReportAsCsv(rows: ReportRow[], fileLabel: string): Promise<void> {
  const csv = buildCsv(rows);
  const fileUri = `${FileSystem.cacheDirectory}relatorio-${fileLabel}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Exportar relatório (CSV)" });
  }
}
