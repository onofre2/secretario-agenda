import { getDb } from "../db";
import { ClinicalNote, ID } from "../types";

export interface ClinicalNoteWithContext extends ClinicalNote {
  date: string;
  time: string;
  clinic_name: string;
}

/** Lista todas as evoluções clínicas de um paciente, mais recentes primeiro. */
export async function listNotesByPatient(patientId: ID): Promise<ClinicalNoteWithContext[]> {
  const db = await getDb();
  return db.getAllAsync<ClinicalNoteWithContext>(
    `SELECT n.*, a.date, a.time, c.name as clinic_name
     FROM clinical_notes n
     JOIN appointments a ON a.id = n.appointment_id
     JOIN clinics c ON c.id = a.clinic_id
     WHERE n.patient_id = ?
     ORDER BY a.date DESC, a.time DESC`,
    [patientId]
  );
}

export async function getNoteByAppointment(appointmentId: ID): Promise<ClinicalNote | null> {
  const db = await getDb();
  return db.getFirstAsync<ClinicalNote>(
    "SELECT * FROM clinical_notes WHERE appointment_id = ?",
    [appointmentId]
  );
}

/**
 * Atualiza o conteúdo de uma evolução clínica. O profissional sempre revisa
 * o rascunho antes de finalizar — isso marca is_draft = 0.
 */
export async function updateNoteContent(id: ID, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE clinical_notes SET content = ?, is_draft = 0, updated_at = datetime('now') WHERE id = ?`,
    [content, id]
  );
}
