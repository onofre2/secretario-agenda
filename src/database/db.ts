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
