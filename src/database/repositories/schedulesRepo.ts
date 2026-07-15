import { getDb } from "../db";
import { Schedule, NewSchedule, ID } from "../types";

export async function listSchedules(activeOnly = true): Promise<Schedule[]> {
  const db = await getDb();
  const sql = activeOnly
    ? "SELECT * FROM schedules WHERE active = 1 ORDER BY weekday ASC, time ASC"
    : "SELECT * FROM schedules ORDER BY weekday ASC, time ASC";
  return db.getAllAsync<Schedule>(sql);
}

export async function createSchedule(data: NewSchedule): Promise<ID> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO schedules (patient_id, clinic_id, weekday, time, session_value, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.patient_id, data.clinic_id, data.weekday, data.time, data.session_value, data.active ? 1 : 0]
  );
  return result.lastInsertRowId;
}

export async function pauseSchedule(id: ID, active: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE schedules SET active = ?, updated_at = datetime('now') WHERE id = ?",
    [active ? 1 : 0, id]
  );
}

export async function duplicateSchedule(id: ID): Promise<ID> {
  const db = await getDb();
  const original = await db.getFirstAsync<Schedule>(
    "SELECT * FROM schedules WHERE id = ?",
    [id]
  );
  if (!original) throw new Error(`Horário ${id} não encontrado`);
  return createSchedule({
    patient_id: original.patient_id,
    clinic_id: original.clinic_id,
    weekday: original.weekday,
    time: original.time,
    session_value: original.session_value,
    active: true,
  });
}

export async function deleteSchedule(id: ID): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM schedules WHERE id = ?", [id]);
}

/**
 * Gera os appointments (ocorrências concretas) de uma data específica
 * a partir dos schedules ativos daquele dia da semana.
 * Idempotente: não duplica se já existir appointment para o mesmo schedule+data.
 */
export async function generateAppointmentsForDate(date: string): Promise<void> {
  const db = await getDb();
  const weekday = new Date(date + "T00:00:00").getDay();

  const schedules = await db.getAllAsync<Schedule>(
    "SELECT * FROM schedules WHERE active = 1 AND weekday = ?",
    [weekday]
  );

  for (const s of schedules) {
    const existing = await db.getFirstAsync(
      "SELECT id FROM appointments WHERE schedule_id = ? AND date = ?",
      [s.id, date]
    );
    if (existing) continue;

    await db.runAsync(
      `INSERT INTO appointments
        (schedule_id, patient_id, clinic_id, date, time, session_value, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [s.id, s.patient_id, s.clinic_id, date, s.time, s.session_value]
    );
  }
}
