import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ReportRow } from "../database/repositories/reportsRepo";

const STATUS_LABEL: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Pendente",
};

export async function exportReportAsExcel(rows: ReportRow[], fileLabel: string): Promise<void> {
  const worksheetData = [
    ["Data", "Horário", "Paciente", "Clínica", "Status", "Valor (R$)"],
    ...rows.map((r) => [
      r.date,
      r.time,
      r.patient_name,
      r.clinic_name,
      STATUS_LABEL[r.status] ?? r.status,
      r.session_value,
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

  // SheetJS gera base64 puro (sem cabeçalho data:) — ideal para gravar como arquivo binário.
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

  const fileUri = `${FileSystem.cacheDirectory}relatorio-${fileLabel}.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Exportar relatório (Excel)",
    });
  }
}
