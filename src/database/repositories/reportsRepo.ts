import { getDb } from "../db";

export interface ReportRow {
  date: string;
  time: string;
  patient_name: string;
  clinic_name: string;
  status: "pending" | "present" | "absent";
  session_value: number;
}

/** Todos os atendimentos (com nomes já resolvidos) em um intervalo de datas, para relatórios/exportação. */
export async function getReportRows(startDate: string, endDate: string): Promise<ReportRow[]> {
  const db = await getDb();
  return db.getAllAsync<ReportRow>(
    `SELECT a.date, a.time, p.full_name as patient_name, c.name as clinic_name,
            a.status, a.session_value
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN clinics c ON c.id = a.clinic_id
     WHERE a.date BETWEEN ? AND ?
     ORDER BY a.date ASC, a.time ASC`,
    [startDate, endDate]
  );
}
