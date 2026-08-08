import { getDb } from "../db";
import { Patient, NewPatient, ID } from "../types";

export async function listPatients(): Promise<Patient[]> {
  const db = await getDb();
  return db.getAllAsync<Patient>("SELECT * FROM patients ORDER BY full_name ASC");
}

export async function getPatient(id: ID): Promise<Patient | null> {
  const db = await getDb();
  return db.getFirstAsync<Patient>("SELECT * FROM patients WHERE id = ?", [id]);
}

export async function createPatient(data: NewPatient): Promise<ID> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO patients
      (full_name, diagnosis, treatment_goals, clinical_history, qp, insurance,
       default_session_value, phone, email, observations, note_profile)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.full_name,
      data.diagnosis,
      data.treatment_goals,
      data.clinical_history,
      data.qp,
      data.insurance,
      data.default_session_value,
      data.phone,
      data.email,
      data.observations,
      data.note_profile,
    ]
  );
  return result.lastInsertRowId;
}

export async function updatePatient(
  id: ID,
  data: Partial<NewPatient>
): Promise<void> {
  const db = await getDb();
  const current = await getPatient(id);
  if (!current) throw new Error(`Paciente ${id} não encontrado`);
  const m = { ...current, ...data };
  await db.runAsync(
    `UPDATE patients SET
      full_name = ?, diagnosis = ?, treatment_goals = ?, clinical_history = ?, qp = ?,
      insurance = ?, default_session_value = ?, phone = ?, email = ?,
      observations = ?, note_profile = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      m.full_name, m.diagnosis, m.treatment_goals, m.clinical_history, m.qp,
      m.insurance, m.default_session_value, m.phone, m.email,
      m.observations, m.note_profile, id,
    ]
  );
}

export async function deletePatient(id: ID): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM patients WHERE id = ?", [id]);
}

/** Retorna o histórico completo de atendimentos de um paciente (timeline). */
export async function getPatientTimeline(patientId: ID) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT a.id, a.date, a.time, a.status, a.session_value, c.name as clinic_name
     FROM appointments a
     JOIN clinics c ON c.id = a.clinic_id
     WHERE a.patient_id = ? AND a.status != 'cancelled'
     ORDER BY a.date DESC, a.time DESC`,
    [patientId]
  );
}

/** Lista pacientes que têm ao menos um agendamento na clínica informada. */
export async function listPatientsByClinic(clinicId: ID): Promise<Patient[]> {
  const db = await getDb();
  return db.getAllAsync<Patient>(
    `SELECT DISTINCT p.* FROM patients p
     WHERE p.id IN (
       SELECT patient_id FROM schedules WHERE clinic_id = ?
       UNION
       SELECT patient_id FROM appointments WHERE clinic_id = ?
     )
     ORDER BY p.full_name ASC`,
    [clinicId, clinicId]
  );
}
