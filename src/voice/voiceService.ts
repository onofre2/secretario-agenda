import * as Speech from "expo-speech";
import { TodayAppointment } from "../database/repositories/appointmentsRepo";
import { formatCurrency } from "../utils/date";

const STATUS_SPOKEN: Record<string, string> = {
  present: "presença registrada",
  absent: "ausente",
  pending: "pendente",
};

/**
 * Lê em voz alta a agenda do dia — usa síntese de voz nativa do aparelho,
 * funciona 100% offline. Comandos de voz (reconhecimento de fala) ficam
 * arquitetados para uma versão futura, mas desabilitados nesta versão
 * porque exigem reconhecimento de fala confiável, que normalmente depende
 * de serviço online — fora do escopo "offline first" da v1.
 */
export function speakTodaySchedule(appointments: TodayAppointment[]): void {
  Speech.stop();

  if (appointments.length === 0) {
    Speech.speak("Você não tem nenhum compromisso hoje.", { language: "pt-BR" });
    return;
  }

  const parts: string[] = [];
  parts.push(
    `Hoje você tem ${appointments.length} compromisso${appointments.length !== 1 ? "s" : ""}.`
  );

  for (const appt of appointments) {
    parts.push(`${appt.time}, ${appt.patient_name}, na clínica ${appt.clinic_name}.`);
  }

  const expectedRevenue = appointments
    .filter((a) => a.status !== "absent")
    .reduce((sum, a) => sum + a.session_value, 0);
  parts.push(`Receita esperada hoje: ${formatCurrency(expectedRevenue)}.`);

  Speech.speak(parts.join(" "), { language: "pt-BR", rate: 1.0 });
}

/** Lê o resumo de fim de dia: atendimentos, presenças, faltas, receita e taxa de comparecimento. */
export function speakEndOfDaySummary(appointments: TodayAppointment[]): void {
  Speech.stop();

  const present = appointments.filter((a) => a.status === "present").length;
  const absent = appointments.filter((a) => a.status === "absent").length;
  const total = appointments.length;
  const revenue = appointments
    .filter((a) => a.status === "present")
    .reduce((sum, a) => sum + a.session_value, 0);
  const lost = appointments
    .filter((a) => a.status === "absent")
    .reduce((sum, a) => sum + a.session_value, 0);
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  const text = [
    `Resumo do dia.`,
    `${total} compromisso${total !== 1 ? "s" : ""} no total.`,
    `${present} paciente${present !== 1 ? "s" : ""} presente${present !== 1 ? "s" : ""}.`,
    `${absent} falta${absent !== 1 ? "s" : ""}.`,
    `Receita: ${formatCurrency(revenue)}.`,
    lost > 0 ? `Receita perdida: ${formatCurrency(lost)}.` : "",
    `Taxa de comparecimento: ${rate} por cento.`,
  ]
    .filter(Boolean)
    .join(" ");

  Speech.speak(text, { language: "pt-BR", rate: 1.0 });
}

export function stopSpeaking(): void {
  Speech.stop();
}
