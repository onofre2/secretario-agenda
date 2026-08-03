import * as FileSystem from "expo-file-system";
import { getDb } from "../db";
import { PatientDocument, DocumentType, ID } from "../types";

export async function listDocumentsByPatient(patientId: ID): Promise<PatientDocument[]> {
  const db = await getDb();
  return db.getAllAsync<PatientDocument>(
    "SELECT * FROM patient_documents WHERE patient_id = ? ORDER BY created_at DESC",
    [patientId]
  );
}

export async function createPatientDocument(
  patientId: ID,
  filePath: string,
  fileType: DocumentType,
  originalName: string | null
): Promise<ID> {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO patient_documents (patient_id, file_path, file_type, original_name) VALUES (?, ?, ?, ?)",
    [patientId, filePath, fileType, originalName]
  );
  return result.lastInsertRowId;
}

export async function deletePatientDocument(id: ID): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ file_path: string }>(
    "SELECT file_path FROM patient_documents WHERE id = ?",
    [id]
  );
  await db.runAsync("DELETE FROM patient_documents WHERE id = ?", [id]);
  if (row?.file_path) {
    try {
      await FileSystem.deleteAsync(row.file_path, { idempotent: true });
    } catch (err) {
      console.error("Erro ao apagar arquivo do documento:", err);
    }
  }
}
