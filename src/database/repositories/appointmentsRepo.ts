import { getDb } from "../db";
import { Appointment, ID } from "../types";

export interface TodayAppointment extends Appointment {
  patient_name: string;
  clinic_name: string;
}

/** Lista os compromissos de uma data, ordenados por horário (tela "Hoje"). */
export async function getAppointmentsByDate(
  date: string
): Promise<TodayAppointment[]> {
  const db = await getDb();
  return db.getAllAsync<TodayAppointment>(
    `SELECT a.*, p.full_name as patient_name, c.name as clinic_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN clinics c ON c.id = a.clinic_id
     WHERE a.date = ?
     ORDER BY a.time ASC`,
    [date]
  );
}

/**
 * Ação de UM TOQUE: marca presença.
 * Em uma única transação: registra attendance, calcula receita, cria rascunho
 * de evolução clínica e atualiza o status do appointment.
 */
export async function markPresent(appointmentId: ID): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const appt = await db.getFirstAsync<Appointment & { patient_name: string }>(
      `SELECT a.*, p.full_name as patient_name
       FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE a.id = ?`,
      [appointmentId]
    );
    if (!appt) throw new Error(`Compromisso ${appointmentId} não encontrado`);

    await db.runAsync(
      "UPDATE appointments SET status = 'present', updated_at = datetime('now') WHERE id = ?",
      [appointmentId]
    );

    await db.runAsync(
      `INSERT INTO attendance (appointment_id, status, revenue)
       VALUES (?, 'present', ?)`,
      [appointmentId, appt.session_value]
    );

    await db.runAsync(
      `INSERT INTO financial_records (appointment_id, patient_id, clinic_id, date, amount, type)
       VALUES (?, ?, ?, ?, ?, 'revenue')`,
      [appointmentId, appt.patient_id, appt.clinic_id, appt.date, appt.session_value]
    );

    const draft = `O paciente ${appt.patient_name} compareceu à sessão de fisioterapia agendada. Os objetivos terapêuticos foram revisados e as intervenções foram realizadas conforme o plano de tratamento estabelecido.`;

    await db.runAsync(
      `INSERT INTO clinical_notes (appointment_id, patient_id, content, is_draft)
       VALUES (?, ?, ?, 1)`,
      [appointmentId, appt.patient_id, draft]
    );
  });
}

/**
 * Ação de UM TOQUE: marca ausência.
 * Registra a falta e contabiliza a perda financeira para relatórios.
 */
export async function markAbsent(appointmentId: ID): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const appt = await db.getFirstAsync<Appointment>(
      "SELECT * FROM appointments WHERE id = ?",
      [appointmentId]
    );
    if (!appt) throw new Error(`Compromisso ${appointmentId} não encontrado`);

    await db.runAsync(
      "UPDATE appointments SET status = 'absent', updated_at = datetime('now') WHERE id = ?",
      [appointmentId]
    );

    await db.runAsync(
      `INSERT INTO attendance (appointment_id, status, revenue)
       VALUES (?, 'absent', 0)`,
      [appointmentId]
    );

    await db.runAsync(
      `INSERT INTO financial_records (appointment_id, patient_id, clinic_id, date, amount, type)
       VALUES (?, ?, ?, ?, ?, 'loss')`,
      [appointmentId, appt.patient_id, appt.clinic_id, appt.date, appt.session_value]
    );
  });
}

/** Reseta um compromisso para pendente, desfazendo presença/ausência (correção de erro). */
export async function resetStatus(appointmentId: ID): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE appointments SET status = 'pending', updated_at = datetime('now') WHERE id = ?",
      [appointmentId]
    );
    await db.runAsync("DELETE FROM attendance WHERE appointment_id = ?", [appointmentId]);
    await db.runAsync("DELETE FROM financial_records WHERE appointment_id = ?", [appointmentId]);
  });
}

export async function createAppointment(data: {
  patient_id: ID;
  clinic_id: ID;
  date: string;
  time: string;
  session_value: number;
}): Promise<ID> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO appointments (schedule_id, patient_id, clinic_id, date, time, session_value, status)
     VALUES (NULL, ?, ?, ?, ?, ?, 'pending')`,
    [data.patient_id, data.clinic_id, data.date, data.time, data.session_value]
  );
  return result.lastInsertRowId;
}
