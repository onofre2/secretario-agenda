import * as Notifications from "expo-notifications";
import { APPOINTMENT_CATEGORY, DEFAULT_LEAD_MINUTES } from "./config";
import { getAppointmentsByDate, TodayAppointment } from "../database/repositories/appointmentsRepo";
import {
  upsertNotificationLog,
  getNotificationIdentifier,
  deleteNotificationLog,
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

/** Agenda (ou reagenda) o lembrete de um único compromisso, se ele ainda estiver no futuro. */
export async function scheduleForAppointment(
  appointment: TodayAppointment,
  leadMinutes = DEFAULT_LEAD_MINUTES
): Promise<void> {
  await cancelForAppointment(appointment.id);

  if (appointment.status !== "pending") return;

  const enabled = await getSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
  if (enabled === "0") return; // notificacoes desativadas pelo usuario

  const triggerDate = computeTriggerDate(appointment.date, appointment.time, leadMinutes);
  if (triggerDate.getTime() <= Date.now()) return; // já passou, não agenda

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

/** Cancela a notificação agendada de um compromisso (ex: quando já foi marcado presente/ausente). */
export async function cancelForAppointment(appointmentId: number): Promise<void> {
  const identifier = await getNotificationIdentifier(appointmentId);
  if (identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  await deleteNotificationLog(appointmentId);
}

/**
 * Agenda os lembretes de todos os compromissos pendentes de hoje.
 * Chamado no boot do app e sempre que a tela Hoje é aberta/atualizada.
 * Compromissos já marcados presente/ausente não geram notificação
 * (efeito colateral: após o último paciente do dia, não sobra nenhum
 * lembrete pendente — "parar notificações após o último paciente").
 */
export async function scheduleAllPendingForToday(leadMinutes = DEFAULT_LEAD_MINUTES): Promise<void> {
  const appointments = await getAppointmentsByDate(todayISO());
  for (const appt of appointments) {
    if (appt.status === "pending") {
      await scheduleForAppointment(appt, leadMinutes);
    } else {
      await cancelForAppointment(appt.id);
    }
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
  await cancelMorningAgendaNotification();

  const enabled = await getSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED);
  if (enabled === "0") return;

  const appointments = await getAppointmentsByDate(todayISO());
  if (appointments.length === 0) return;

  const sorted = [...appointments].sort((a, b) => a.time.localeCompare(b.time));
  const first = sorted[0];

  const triggerDate = computeTriggerDate(todayISO(), first.time, 60);
  if (triggerDate.getTime() <= Date.now()) return;

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
}
