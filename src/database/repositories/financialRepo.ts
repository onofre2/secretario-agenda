import { getDb } from "../db";

export interface FinancialSummary {
  revenue: number;
  loss: number;
  appointmentsCount: number;
  presentCount: number;
  absentCount: number;
}

/** Resumo financeiro entre duas datas (inclusive), formato "YYYY-MM-DD". */
export async function getSummary(
  startDate: string,
  endDate: string
): Promise<FinancialSummary> {
  const db = await getDb();

  const totals = await db.getFirstAsync<{ revenue: number; loss: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as revenue,
       COALESCE(SUM(CASE WHEN type = 'loss' THEN amount ELSE 0 END), 0) as loss
     FROM financial_records
     WHERE date BETWEEN ? AND ?`,
    [startDate, endDate]
  );

  const counts = await db.getFirstAsync<{
    total: number;
    present: number;
    absent: number;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
       SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
     FROM appointments
     WHERE date BETWEEN ? AND ? AND status != 'cancelled'`,
    [startDate, endDate]
  );

  return {
    revenue: totals?.revenue ?? 0,
    loss: totals?.loss ?? 0,
    appointmentsCount: counts?.total ?? 0,
    presentCount: counts?.present ?? 0,
    absentCount: counts?.absent ?? 0,
  };
}

export async function getRevenueByClinic(startDate: string, endDate: string) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT c.name as clinic_name, SUM(f.amount) as total
     FROM financial_records f
     JOIN clinics c ON c.id = f.clinic_id
     WHERE f.type = 'revenue' AND f.date BETWEEN ? AND ?
     GROUP BY c.id ORDER BY total DESC`,
    [startDate, endDate]
  );
}

export async function getLossByClinic(startDate: string, endDate: string) {
  const db = await getDb();
  return db.getAllAsync<{ clinic_name: string; total: number }>(
    `SELECT c.name as clinic_name, SUM(f.amount) as total
     FROM financial_records f
     JOIN clinics c ON c.id = f.clinic_id
     WHERE f.type = 'loss' AND f.date BETWEEN ? AND ?
     GROUP BY c.id ORDER BY total DESC`,
    [startDate, endDate]
  );
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

export async function getRevenueTrend(startDate: string, endDate: string): Promise<RevenueTrendPoint[]> {
  const db = await getDb();
  return db.getAllAsync<RevenueTrendPoint>(
    `SELECT date, SUM(amount) as revenue
     FROM financial_records
     WHERE type = 'revenue' AND date BETWEEN ? AND ?
     GROUP BY date ORDER BY date ASC`,
    [startDate, endDate]
  );
}

export interface MonthlyRevenuePoint {
  month: string; // "YYYY-MM"
  revenue: number;
}

/** Receita agrupada por mes, para os ultimos 12 meses incluindo o atual. */
export async function getMonthlyRevenueLast12Months(): Promise<MonthlyRevenuePoint[]> {
  const db = await getDb();
  return db.getAllAsync<MonthlyRevenuePoint>(
    `SELECT substr(date, 1, 7) as month, SUM(amount) as revenue
     FROM financial_records
     WHERE type = 'revenue' AND date >= date('now', '-12 months', 'start of month')
     GROUP BY month ORDER BY month ASC`
  );
}

export interface ClinicAttendanceStats {
  clinic_name: string;
  present: number;
  absent: number;
}

export async function getAttendanceByClinic(startDate: string, endDate: string): Promise<ClinicAttendanceStats[]> {
  const db = await getDb();
  return db.getAllAsync<ClinicAttendanceStats>(
    `SELECT c.name as clinic_name,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent
     FROM appointments a
     JOIN clinics c ON c.id = a.clinic_id
     WHERE a.date BETWEEN ? AND ? AND a.status != 'cancelled'
     GROUP BY c.id
     ORDER BY c.name ASC`,
    [startDate, endDate]
  );
}
