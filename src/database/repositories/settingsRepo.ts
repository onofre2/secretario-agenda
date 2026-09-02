import { getDb } from "../db";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export const SETTINGS_KEYS = {
  THEME: "theme", // "dark" | "light"
  NOTIFICATION_LEAD_MINUTES: "notification_lead_minutes",
  LAST_BACKUP_DATE: "last_backup_date",
  LAST_NOTE_TEMPLATE: "last_note_template",
  MONTHLY_GOAL: "monthly_financial_goal",
  INVESTMENT_PERCENT: "investment_percent",
  NOTIFICATIONS_ENABLED: "notifications_enabled",
  MORNING_NOTIFICATION_ID: "morning_notification_id",
  MORNING_NOTIFICATION_TRIGGER: "morning_notification_trigger",
  SIGNATURE_IMAGE_PATH: "signature_image_path",
  THERAPIST_NAME: "therapist_name",
  THERAPIST_PROFESSION: "therapist_profession",
  THERAPIST_REGISTRATION: "therapist_registration",
  YEAR_END_BACKUP_NOTIFICATION_ID: "year_end_backup_notification_id",
  YEAR_END_BACKUP_YEAR: "year_end_backup_year",
  ORPHAN_NOTIFICATIONS_CLEANED: "orphan_notifications_cleaned",
  MONTHLY_BACKUP_NOTIFICATION_ID: "monthly_backup_notification_id",
  MONTHLY_BACKUP_MONTH: "monthly_backup_month",
} as const;
