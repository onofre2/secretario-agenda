import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { closeDatabase, DATABASE_FILE_NAME, initDatabase } from "../database/db";

function dbFilePath(): string {
  return `${FileSystem.documentDirectory}SQLite/${DATABASE_FILE_NAME}`;
}

/** Copia o arquivo do banco para uma pasta compartilhável e abre o menu de compartilhamento/salvamento. */
export async function exportBackup(): Promise<void> {
  const source = dbFilePath();
  const info = await FileSystem.getInfoAsync(source);
  if (!info.exists) throw new Error("Banco de dados ainda não foi criado.");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = `${FileSystem.cacheDirectory}backup-secretario-agenda-${timestamp}.db`;
  await FileSystem.copyAsync({ from: source, to: dest });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, { dialogTitle: "Salvar backup do Secretário Agenda" });
  }
}

/**
 * Deixa o usuário escolher um arquivo .db previamente exportado e restaura
 * por cima do banco atual. TODOS os dados atuais são substituídos.
 */
export async function restoreBackup(): Promise<"restored" | "cancelled"> {
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return "cancelled";

  const pickedUri = result.assets[0].uri;

  await closeDatabase();
  const dest = dbFilePath();

  // Garante que a pasta SQLite existe antes de copiar por cima.
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`, { intermediates: true }).catch(() => {});

  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }
  await FileSystem.copyAsync({ from: pickedUri, to: dest });

  await initDatabase();
  return "restored";
}

import { getSetting, setSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";

/** Marca a data de hoje como último backup realizado. */
export async function markBackupDone(): Promise<void> {
  await setSetting(SETTINGS_KEYS.LAST_BACKUP_DATE, new Date().toISOString());
}

/** Retorna true se já passaram 31 dias ou mais desde o último backup (ou se nunca foi feito). */
export async function isBackupOverdue(): Promise<boolean> {
  const lastBackup = await getSetting(SETTINGS_KEYS.LAST_BACKUP_DATE);
  if (!lastBackup) return true;
  const last = new Date(lastBackup).getTime();
  const now = Date.now();
  const daysSince = (now - last) / (1000 * 60 * 60 * 24);
  return daysSince >= 31;
}
