import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from "./schema";

const DB_NAME = "secretario_agenda.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Retorna a instância única (singleton) do banco, abrindo-a se necessário.
 * Usar sempre essa função em vez de abrir o banco diretamente em outros arquivos.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

/**
 * Cria as tabelas (se não existirem) e roda migrações futuras.
 * Deve ser chamado uma vez, no boot do app (App.tsx).
 */
export async function initDatabase(): Promise<void> {
  const db = await getDb();

  await db.execAsync(CREATE_TABLES_SQL);

  const versionRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'schema_version'"
  );

  if (!versionRow) {
    await db.runAsync(
      "INSERT INTO settings (key, value) VALUES ('schema_version', ?)",
      [String(SCHEMA_VERSION)]
    );
  } else {
    const currentVersion = Number(versionRow.value);
    if (currentVersion < SCHEMA_VERSION) {
      await runMigrations(db, currentVersion);
      await db.runAsync(
        "UPDATE settings SET value = ? WHERE key = 'schema_version'",
        [String(SCHEMA_VERSION)]
      );
    }
  }
}

/**
 * Espaço reservado para migrações incrementais entre versões do schema.
 * Ex: if (fromVersion < 2) { await db.execAsync("ALTER TABLE ..."); }
 */
async function runMigrations(
  db: SQLite.SQLiteDatabase,
  fromVersion: number
): Promise<void> {
  if (fromVersion < 2) {
    await db.execAsync(
      "ALTER TABLE notification_log ADD COLUMN notification_identifier TEXT;"
    );
  }
  if (fromVersion < 3) {
    await db.execAsync(
      "ALTER TABLE schedules ADD COLUMN reminder TEXT;"
    );
  }
  if (fromVersion < 4) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS patient_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK (file_type IN ('photo','pdf')),
        original_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`
    );
  }
  if (fromVersion < 5) {
    await db.execAsync("PRAGMA foreign_keys = OFF;");
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE appointments_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
          patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          session_value REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','present','absent','cancelled')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO appointments_new SELECT * FROM appointments;
        DROP TABLE appointments;
        ALTER TABLE appointments_new RENAME TO appointments;
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
        CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
      `);
    });
    await db.execAsync("PRAGMA foreign_keys = ON;");
  }
}

/**
 * Fecha a conexão atual do banco. Necessário antes de sobrescrever o arquivo
 * .db físico (restauração de backup) — a próxima chamada a getDb() reabre.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

export const DATABASE_FILE_NAME = DB_NAME;

/**
 * Apaga TODOS os dados (usado apenas em testes/dev). Nunca chamar em produção
 * sem confirmação explícita do usuário.
 */
export async function resetDatabaseForDev(): Promise<void> {
  const db = await getDb();
  const tables = [
    "notification_log",
    "financial_records",
    "clinical_notes",
    "attendance",
    "appointments",
    "schedules",
    "patients",
    "clinics",
    "backups",
  ];
  for (const table of tables) {
    await db.execAsync(`DELETE FROM ${table};`);
  }
}
