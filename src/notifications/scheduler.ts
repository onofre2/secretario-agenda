import * as Notifications from "expo-notifications";
import { APPOINTMENT_CATEGORY, DEFAULT_LEAD_MINUTES } from "./config";
import { getAppointmentsByDate, TodayAppointment } from "../database/repositories/appointmentsRepo";
import {
  upsertNotificationLog,
  getNotificationLog,
  deleteNotificationLog,
  clearAllNotificationLogs,
} from "../database/repositories/notificationsRepo";
import { todayISO } from "../utils/date";
import { getSetting, setSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";

/** Calcula o Date real de disparo: horário do compromisso menos os minutos de antecedência. */
export function computeTriggerDate(dateISO: string, timeHHmm: string, leadMinutes: number): Date {
  const [hours, minutes] = timeHHmm.split(":").map(Number);
  const target = new Date(dateISO + "T00:00:00");
  target.setHours(hours, minutes, 0, 0);
  target.setMinutes(target.getMinutes() - leadMinutes);
  return target;
}

/**
 * Agenda (ou reagenda) o lembrete de um único compromisso, se ele ainda estiver no futuro.
 * Idempotente: se já existe uma notificação agendada para o mesmo horário exato,
 * não cancela nem recria (evita sobrecarregar o AlarmManager do Android, que pode
 * atrasar/agrupar notificações quando canceladas e recriadas repetidamente).
 */
export async function scheduleForAppointment(
  appointment: TodayAppointment,
  leadMinutes = DEFAULT_LEAD_MINUTES
): Promise<void> {
  if (appointment.status !== "pending") {
    await cancelForAppointment(appointment.id);
    return;
  }

  const enabled = await getSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
  if (enabled === "0") {
    await cancelForAppointment(appointment.id);
    return;
  }

  const triggerDate = computeTriggerDate(appointment.date, appointment.time, leadMinutes);
  if (triggerDate.getTime() <= Date.now()) {
    await cancelForAppointment(appointment.id);
    return;
  }

  const existing = await getNotificationLog(appointment.id);
  if (existing && existing.scheduledFor === triggerDate.toISOString()) {
    // Já está agendado para o horário certo — não mexe, evita instabilidade no Android.
    return;
  }

  await cancelForAppointment(appointment.id);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${appointment.time} · ${appointment.patient_name}`,
      body: `Clínica: ${appointment.clinic_name}`,
      categoryIdentifier: APPOINTMENT_CATEGORY,
      data: { appointmentId: appointment.id },
      sound: "default",
    },
    trigger: {
      date: triggerDate,
      channelId: "appointments",
    },
  });

  await upsertNotificationLog(appointment.id, triggerDate.toISOString(), identifier);
}

/**
 * Cancela a notificação agendada de um compromisso (ex: quando já foi marcado presente/ausente)
 * e também remove da tela qualquer notificação já entregue para ele (Android mantém notificações
 * entregues na barra até serem removidas explicitamente ou pelo usuário).
 */
export async function cancelForAppointment(appointmentId: number): Promise<void> {
  const log = await getNotificationLog(appointmentId);
  if (log) {
    try {
      await Notifications.cancelScheduledNotificationAsync(log.identifier);
    } catch (err) {
      console.error("Erro ao cancelar notificação agendada:", err);
    }
    try {
      await Notifications.dismissNotificationAsync(log.identifier);
    } catch (err) {
      console.error("Erro ao remover notificação entregue:", err);
    }
  }
  await deleteNotificationLog(appointmentId);
}

/**
 * Agenda os lembretes de todos os compromissos pendentes de hoje.
 * Chamado no boot do app e sempre que a tela Hoje é aberta/atualizada.
 * Idempotente: compromissos já com notificação correta agendada não são tocados.
 */
export async function scheduleAllPendingForToday(leadMinutes = DEFAULT_LEAD_MINUTES): Promise<void> {
  const appointments = await getAppointmentsByDate(todayISO());
  for (const appt of appointments) {
    await scheduleForAppointment(appt, leadMinutes);
  }
}

/** Adia a notificação de um compromisso em 5 minutos (ação "Adiar" na notificação). */
export async function snoozeAppointment(appointmentId: number, minutes = 5): Promise<void> {
  await cancelForAppointment(appointmentId);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Lembrete adiado",
      body: "Toque para ver o compromisso adiado.",
      categoryIdentifier: APPOINTMENT_CATEGORY,
      data: { appointmentId },
      sound: "default",
    },
    trigger: {
      seconds: minutes * 60,
      channelId: "appointments",
    },
  });
  await upsertNotificationLog(appointmentId, new Date(Date.now() + minutes * 60000).toISOString(), identifier);
}

/** Cancela a notificação matinal "Bom dia" previamente agendada, se houver. */
export async function cancelMorningAgendaNotification(): Promise<void> {
  const identifier = await getSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_ID);
  if (identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await setSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_ID, "");
  }
}

/**
 * Agenda a notificação diária "Bom dia", disparada 1 hora antes do primeiro
 * compromisso do dia. Ao tocar, o app abre e já lê a agenda em áudio.
 * Chamado no boot do app e sempre que a tela Hoje é aberta/atualizada
 * (mesmo padrão dos lembretes de compromisso).
 */
export async function scheduleMorningAgendaNotification(): Promise<void> {
  const enabled = await getSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
  if (enabled === "0") {
    await cancelMorningAgendaNotification();
    return;
  }

  const appointments = await getAppointmentsByDate(todayISO());
  if (appointments.length === 0) {
    await cancelMorningAgendaNotification();
    return;
  }

  const sorted = [...appointments].sort((a, b) => a.time.localeCompare(b.time));
  const first = sorted[0];

  const triggerDate = computeTriggerDate(todayISO(), first.time, 60);
  if (triggerDate.getTime() <= Date.now()) {
    await cancelMorningAgendaNotification();
    return;
  }

  const existingId = await getSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_ID);
  const existingTriggerKey = await getSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_TRIGGER);
  if (existingId && existingTriggerKey === triggerDate.toISOString()) {
    // Já agendada para o horário certo — não mexe.
    return;
  }

  await cancelMorningAgendaNotification();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Bom dia! Sua agenda começa em 1 hora",
      body: "Toque para ouvir sua agenda completa em áudio.",
      data: { morningAgenda: true },
      sound: "default",
    },
    trigger: {
      date: triggerDate,
      channelId: "appointments",
    },
  });

  await setSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_ID, identifier);
  await setSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_TRIGGER, triggerDate.toISOString());
}

/** Cancela a notificação de backup de fim de ano previamente agendada, se houver. */
export async function cancelYearEndBackupNotification(): Promise<void> {
  const identifier = await getSetting(SETTINGS_KEYS.YEAR_END_BACKUP_NOTIFICATION_ID);
  if (identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await setSetting(SETTINGS_KEYS.YEAR_END_BACKUP_NOTIFICATION_ID, "");
  }
}

/**
 * Agenda o lembrete anual de backup do Balanço, disparado em 20 de dezembro.
 * Idempotente: só agenda uma vez por ano (controlado por YEAR_END_BACKUP_YEAR).
 * Não apaga nenhum dado — apenas lembra o usuário de exportar o PDF antes da virada.
 * Chamado no boot do app, mesmo padrão dos outros lembretes.
 */
export async function scheduleYearEndBackupNotification(): Promise<void> {
  const enabled = await getSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
  if (enabled === "0") {
    await cancelYearEndBackupNotification();
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const triggerDate = new Date(year, 11, 20, 9, 0, 0); // 20 de dezembro, 09:00

  if (triggerDate.getTime() <= Date.now()) {
    // já passou 20/dez deste ano — nada a agendar agora, será reavaliado no próximo boot do ano seguinte.
    return;
  }

  const alreadyScheduledYear = await getSetting(SETTINGS_KEYS.YEAR_END_BACKUP_YEAR);
  if (alreadyScheduledYear === String(year)) {
    return;
  }

  await cancelYearEndBackupNotification();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Fim de ano chegando — faça o backup do Balanço",
      body: "Exporte o PDF do Balanço antes da virada do ano. Seus dados não são apagados, mas é bom manter um registro salvo.",
      data: { yearEndBackup: true },
      sound: "default",
    },
    trigger: {
      date: triggerDate,
      channelId: "appointments",
    },
  });

  await setSetting(SETTINGS_KEYS.YEAR_END_BACKUP_NOTIFICATION_ID, identifier);
  await setSetting(SETTINGS_KEYS.YEAR_END_BACKUP_YEAR, String(year));
}

/**
 * Limpeza única de notificações órfãs: cancela TODAS as notificações agendadas no sistema
 * e limpa o log local, para remover lembretes antigos de versões anteriores do app que
 * ficaram presos no sistema (ex: lembrete de backup repetindo todo dia). Roda só uma vez;
 * depois disso, o boot normal já reagenda tudo que deveria existir (compromissos, manhã, etc).
 */
export async function cleanupOrphanedNotificationsOnce(): Promise<void> {
  const alreadyDone = await getSetting(SETTINGS_KEYS.ORPHAN_NOTIFICATIONS_CLEANED);
  if (alreadyDone === "1") return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.error("Erro ao cancelar notificacoes orfas:", err);
  }
  await clearAllNotificationLogs();
  await setSetting(SETTINGS_KEYS.MORNING_NOTIFICATION_ID, "");
  await setSetting(SETTINGS_KEYS.YEAR_END_BACKUP_NOTIFICATION_ID, "");
  await setSetting(SETTINGS_KEYS.YEAR_END_BACKUP_YEAR, "");
  await setSetting(SETTINGS_KEYS.MONTHLY_BACKUP_NOTIFICATION_ID, "");
  await setSetting(SETTINGS_KEYS.MONTHLY_BACKUP_MONTH, "");
  await setSetting(SETTINGS_KEYS.ORPHAN_NOTIFICATIONS_CLEANED, "1");
}

/** Cancela a notificação mensal de backup previamente agendada, se houver. */
export async function cancelMonthlyBackupNotification(): Promise<void> {
  const identifier = await getSetting(SETTINGS_KEYS.MONTHLY_BACKUP_NOTIFICATION_ID);
  if (identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await setSetting(SETTINGS_KEYS.MONTHLY_BACKUP_NOTIFICATION_ID, "");
  }
}

/**
 * Agenda o lembrete mensal de backup, disparado uma única vez, sempre no dia 28 de cada mês
 * (dia 28 é usado propositalmente por ser válido em todos os meses, incluindo fevereiro).
 * Idempotente: só agenda uma vez por mês (controlado por MONTHLY_BACKUP_MONTH, formato "YYYY-MM").
 */
export async function scheduleMonthlyBackupNotification(): Promise<void> {
  const enabled = await getSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
  if (enabled === "0") {
    await cancelMonthlyBackupNotification();
    return;
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let triggerDate = new Date(now.getFullYear(), now.getMonth(), 28, 9, 0, 0);
  if (triggerDate.getTime() <= Date.now()) {
    // Dia 28 deste mês já passou — agenda para o dia 28 do próximo mês.
    triggerDate = new Date(now.getFullYear(), now.getMonth() + 1, 28, 9, 0, 0);
  }
  const targetMonthKey = `${triggerDate.getFullYear()}-${String(triggerDate.getMonth() + 1).padStart(2, "0")}`;

  const alreadyScheduledMonth = await getSetting(SETTINGS_KEYS.MONTHLY_BACKUP_MONTH);
  if (alreadyScheduledMonth === targetMonthKey) {
    return;
  }

  await cancelMonthlyBackupNotification();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Backup mensal",
      body: "Hoje é dia 28 — aproveite para fazer o backup do app.",
      data: { monthlyBackup: true },
      sound: "default",
    },
    trigger: {
      date: triggerDate,
      channelId: "appointments",
    },
  });

  await setSetting(SETTINGS_KEYS.MONTHLY_BACKUP_NOTIFICATION_ID, identifier);
  await setSetting(SETTINGS_KEYS.MONTHLY_BACKUP_MONTH, targetMonthKey);
}
