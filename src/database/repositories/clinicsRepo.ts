import { getDb } from "../db";
import { Clinic, NewClinic, ID } from "../types";

export async function listClinics(): Promise<Clinic[]> {
  const db = await getDb();
  return db.getAllAsync<Clinic>("SELECT * FROM clinics ORDER BY name ASC");
}

export async function getClinic(id: ID): Promise<Clinic | null> {
  const db = await getDb();
  return db.getFirstAsync<Clinic>("SELECT * FROM clinics WHERE id = ?", [id]);
}

export async function createClinic(data: NewClinic): Promise<ID> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO clinics (name, address, phone, payment_info, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.address, data.phone, data.payment_info, data.notes]
  );
  return result.lastInsertRowId;
}

export async function updateClinic(
  id: ID,
  data: Partial<NewClinic>
): Promise<void> {
  const db = await getDb();
  const current = await getClinic(id);
  if (!current) throw new Error(`Clínica ${id} não encontrada`);
  const merged = { ...current, ...data };
  await db.runAsync(
    `UPDATE clinics
     SET name = ?, address = ?, phone = ?, payment_info = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [merged.name, merged.address, merged.phone, merged.payment_info, merged.notes, id]
  );
}

export async function deleteClinic(id: ID): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM clinics WHERE id = ?", [id]);
}
