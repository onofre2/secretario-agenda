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
     WHERE date BETWEEN ? AND ?`,
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
