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
      (full_name, diagnosis, treatment_goals, clinical_history, insurance,
       default_session_value, phone, email, emergency_contact, observations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.full_name,
      data.diagnosis,
      data.treatment_goals,
      data.clinical_history,
      data.insurance,
      data.default_session_value,
      data.phone,
      data.email,
      data.emergency_contact,
      data.observations,
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
      full_name = ?, diagnosis = ?, treatment_goals = ?, clinical_history = ?,
      insurance = ?, default_session_value = ?, phone = ?, email = ?,
      emergency_contact = ?, observations = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      m.full_name, m.diagnosis, m.treatment_goals, m.clinical_history,
      m.insurance, m.default_session_value, m.phone, m.email,
      m.emergency_contact, m.observations, id,
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
     WHERE a.patient_id = ?
     ORDER BY a.date DESC, a.time DESC`,
    [patientId]
  );
}
