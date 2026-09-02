import { getDb } from "../db";
import { ID } from "../types";

/** Grava ou substitui o registro de notificação agendada para um compromisso. */
export async function upsertNotificationLog(
  appointmentId: ID,
  scheduledFor: string,
  notificationIdentifier: string
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM notification_log WHERE appointment_id = ?", [appointmentId]);
    await db.runAsync(
      `INSERT INTO notification_log (appointment_id, scheduled_for, notification_identifier, sent)
       VALUES (?, ?, ?, 0)`,
      [appointmentId, scheduledFor, notificationIdentifier]
    );
  });
}

export async function getNotificationLog(appointmentId: ID): Promise<{ identifier: string; scheduledFor: string } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ notification_identifier: string | null; scheduled_for: string }>(
    "SELECT notification_identifier, scheduled_for FROM notification_log WHERE appointment_id = ?",
    [appointmentId]
  );
  if (!row?.notification_identifier) return null;
  return { identifier: row.notification_identifier, scheduledFor: row.scheduled_for };
}
export async function getNotificationIdentifier(appointmentId: ID): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ notification_identifier: string | null }>(
    "SELECT notification_identifier FROM notification_log WHERE appointment_id = ?",
    [appointmentId]
  );
  return row?.notification_identifier ?? null;
}

export async function deleteNotificationLog(appointmentId: ID): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM notification_log WHERE appointment_id = ?", [appointmentId]);
}

/** Remove todos os registros de notificação — usado apenas em limpezas únicas de migração. */
export async function clearAllNotificationLogs(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM notification_log");
}
