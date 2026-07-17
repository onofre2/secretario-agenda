import { getDb } from "../db";

export interface ReportRow {
  date: string;
  time: string;
  patient_name: string;
  clinic_name: string;
  status: "pending" | "present" | "absent";
  session_value: number;
}

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

export interface ClinicalEvolutionRow {
  date: string;
  time: string;
  patient_name: string;
  clinic_name: string;
  content: string;
  is_draft: boolean;
}

export async function getClinicalEvolutionRows(
  startDate: string,
  endDate: string
): Promise<ClinicalEvolutionRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    date: string;
    time: string;
    patient_name: string;
    clinic_name: string;
    content: string;
    is_draft: number;
  }>(
    `SELECT a.date, a.time, p.full_name as patient_name, c.name as clinic_name,
            n.content, n.is_draft
     FROM clinical_notes n
     JOIN appointments a ON a.id = n.appointment_id
     JOIN patients p ON p.id = n.patient_id
     JOIN clinics c ON c.id = a.clinic_id
     WHERE a.date BETWEEN ? AND ?
     ORDER BY a.date ASC, a.time ASC`,
    [startDate, endDate]
  );
  return rows.map((r) => ({ ...r, is_draft: !!r.is_draft }));
}
