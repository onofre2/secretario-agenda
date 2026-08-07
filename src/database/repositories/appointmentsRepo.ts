import { getDb } from "../db";
import { Appointment, ID } from "../types";
import { getSetting, setSetting, SETTINGS_KEYS } from "./settingsRepo";
import * as Notifications from "expo-notifications";

const NOTE_BLOCKS = {
  abertura: [
    (name: string) => `${name} compareceu à sessão dentro do horário agendado.`,
    (name: string) => `Atendimento iniciado com a presença de ${name}.`,
    (name: string) => `${name} esteve presente para a sessão programada.`,
    (name: string) => `Sessão realizada com ${name}, conforme previsto na agenda.`,
    (name: string) => `${name} compareceu ao atendimento na data e horário combinados.`,
    (name: string) => `Iniciado o atendimento de ${name}, dentro do cronograma estabelecido.`,
    (name: string) => `${name} compareceu pontualmente para dar continuidade ao tratamento.`,
    (name: string) => `Realizada a sessão de ${name}, conforme planejamento assistencial vigente.`,
  ],
  avaliacao: [
    "Antes das condutas, foi feita a revisão do quadro clínico atual.",
    "Observou-se a evolução do paciente desde o último atendimento.",
    "Foi verificada a resposta às intervenções anteriores.",
    "O quadro funcional foi analisado no início do atendimento.",
    "Identificaram-se as necessidades terapêuticas do momento.",
    "Houve breve reavaliação dos sintomas apresentados.",
    "Avaliou-se o progresso alcançado até a presente sessão.",
    "Levantou-se o estado atual do paciente para direcionar a conduta.",
  ],
  intervencao: [
    "Foram aplicadas técnicas específicas para o quadro apresentado.",
    "Realizaram-se exercícios terapêuticos direcionados aos objetivos propostos.",
    "Executou-se o protocolo de tratamento estabelecido.",
    "Foram conduzidas as atividades previstas para esta etapa.",
    "Trabalhou-se com os recursos indicados para o caso.",
    "Desenvolveu-se a sessão com foco nas metas definidas.",
    "Aplicaram-se manobras e exercícios conforme necessidade identificada.",
    "Realizou-se o atendimento com as técnicas apropriadas ao momento.",
  ],
  encerramento: [
    "O paciente segue em acompanhamento regular.",
    "Tratamento será mantido nas próximas sessões.",
    "Progressão terapêutica dentro do esperado.",
    "Segue-se com o plano de reabilitação estabelecido.",
    "Continuidade assegurada até a próxima avaliação.",
    "Evolução positiva, com manutenção da conduta atual.",
    "Novo encontro previsto para dar seguimento ao tratamento.",
    "Plano terapêutico será revisado conforme evolução futura.",
  ],
};

function pickFromBlock(block: string[]): string {
  return block[Math.floor(Math.random() * block.length)];
}

async function pickNoteTemplate(patientName: string): Promise<string> {
  const recentRaw = await getSetting(SETTINGS_KEYS.LAST_NOTE_TEMPLATE);
  let recent: string[] = [];
  try {
    recent = recentRaw ? JSON.parse(recentRaw) : [];
  } catch {
    recent = recentRaw ? [recentRaw] : [];
  }
  let combo: string;
  let attempts = 0;
  do {
    const abertura = NOTE_BLOCKS.abertura[Math.floor(Math.random() * NOTE_BLOCKS.abertura.length)](patientName);
    const avaliacao = pickFromBlock(NOTE_BLOCKS.avaliacao);
    const intervencao = pickFromBlock(NOTE_BLOCKS.intervencao);
    const encerramento = pickFromBlock(NOTE_BLOCKS.encerramento);
    combo = `${abertura} ${avaliacao} ${intervencao} ${encerramento}`;
    attempts++;
  } while (recent.includes(combo) && attempts < 8);
  const updated = [combo, ...recent].slice(0, 3);
  await setSetting(SETTINGS_KEYS.LAST_NOTE_TEMPLATE, JSON.stringify(updated));
  return combo;
}

export interface TodayAppointment extends Appointment {
  patient_name: string;
  clinic_name: string;
  reminder?: string | null;
}

/** Lista os compromissos de uma data, ordenados por horário (tela "Hoje"). */
export async function getAppointmentsByDate(
  date: string
): Promise<TodayAppointment[]> {
  const db = await getDb();
  return db.getAllAsync<TodayAppointment>(
      `SELECT a.*, p.full_name as patient_name, c.name as clinic_name, s.reminder as reminder
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN clinics c ON c.id = a.clinic_id
       LEFT JOIN schedules s ON s.id = a.schedule_id
       WHERE a.date = ? AND a.status != 'cancelled'
       ORDER BY a.time ASC`,
    [date]
  );
}

/**
 * Ação de UM TOQUE: marca presença.
 * Em uma única transação: registra attendance, calcula receita, cria rascunho
 * de evolução clínica e atualiza o status do appointment.
 */
export async function markPresent(appointmentId: ID): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const appt = await db.getFirstAsync<Appointment & { patient_name: string }>(
      `SELECT a.*, p.full_name as patient_name
       FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE a.id = ?`,
      [appointmentId]
    );
    if (!appt) throw new Error(`Compromisso ${appointmentId} não encontrado`);

      await db.runAsync("DELETE FROM attendance WHERE appointment_id = ?", [appointmentId]);
      await db.runAsync("DELETE FROM clinical_notes WHERE appointment_id = ?", [appointmentId]);
      await db.runAsync("DELETE FROM financial_records WHERE appointment_id = ?", [appointmentId]);
    await db.runAsync(
      "UPDATE appointments SET status = 'present', updated_at = datetime('now') WHERE id = ?",
      [appointmentId]
    );

    await db.runAsync(
      `INSERT INTO attendance (appointment_id, status, revenue)
       VALUES (?, 'present', ?)`,
      [appointmentId, appt.session_value]
    );

    await db.runAsync(
      `INSERT INTO financial_records (appointment_id, patient_id, clinic_id, date, amount, type)
       VALUES (?, ?, ?, ?, ?, 'revenue')`,
      [appointmentId, appt.patient_id, appt.clinic_id, appt.date, appt.session_value]
    );

    const draft = await pickNoteTemplate(appt.patient_name);

    await db.runAsync(
      `INSERT INTO clinical_notes (appointment_id, patient_id, content, is_draft)
       VALUES (?, ?, ?, 1)`,
      [appointmentId, appt.patient_id, draft]
    );
    await db.runAsync("UPDATE patients SET consecutive_absences = 0 WHERE id = ?", [appt.patient_id]);
  });
}

/**
 * Ação de UM TOQUE: marca ausência.
 * Registra a falta e contabiliza a perda financeira para relatórios.
 */
export async function markAbsent(appointmentId: ID): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    const appt = await db.getFirstAsync<Appointment>(
      "SELECT * FROM appointments WHERE id = ?",
      [appointmentId]
    );
    if (!appt) throw new Error(`Compromisso ${appointmentId} não encontrado`);

      await db.runAsync("DELETE FROM attendance WHERE appointment_id = ?", [appointmentId]);
      await db.runAsync("DELETE FROM financial_records WHERE appointment_id = ?", [appointmentId]);
    await db.runAsync(
      "UPDATE appointments SET status = 'absent', updated_at = datetime('now') WHERE id = ?",
      [appointmentId]
    );

    await db.runAsync(
      `INSERT INTO attendance (appointment_id, status, revenue)
       VALUES (?, 'absent', 0)`,
      [appointmentId]
    );

    await db.runAsync(
      `INSERT INTO financial_records (appointment_id, patient_id, clinic_id, date, amount, type)
       VALUES (?, ?, ?, ?, ?, 'loss')`,
      [appointmentId, appt.patient_id, appt.clinic_id, appt.date, appt.session_value]
    );
    await db.runAsync("UPDATE patients SET consecutive_absences = consecutive_absences + 1 WHERE id = ?", [appt.patient_id]);
    const patientRow = await db.getFirstAsync<{ consecutive_absences: number; full_name: string }>(
      "SELECT consecutive_absences, full_name FROM patients WHERE id = ?",
      [appt.patient_id]
    );
    if (patientRow && patientRow.consecutive_absences > 0 && patientRow.consecutive_absences % 2 === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Alerta de faltas",
          body: `${patientRow.full_name} faltou ${patientRow.consecutive_absences} vezes seguidas. Considere confirmar os próximos horários.`,
          sound: "default",
        },
        trigger: null,
      });
    }
  });
}

/** Reseta um compromisso para pendente, desfazendo presença/ausência (correção de erro). */
export async function resetStatus(appointmentId: ID): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE appointments SET status = 'pending', updated_at = datetime('now') WHERE id = ?",
      [appointmentId]
    );
    await db.runAsync("DELETE FROM attendance WHERE appointment_id = ?", [appointmentId]);
    await db.runAsync("DELETE FROM clinical_notes WHERE appointment_id = ?", [appointmentId]);
    await db.runAsync("DELETE FROM financial_records WHERE appointment_id = ?", [appointmentId]);
  });
}

export async function createAppointment(data: {
  patient_id: ID;
  clinic_id: ID;
  date: string;
  time: string;
  session_value: number;
}): Promise<ID> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO appointments (schedule_id, patient_id, clinic_id, date, time, session_value, status)
     VALUES (NULL, ?, ?, ?, ?, ?, 'pending')`,
    [data.patient_id, data.clinic_id, data.date, data.time, data.session_value]
  );
  return result.lastInsertRowId;
}

/** Exclui um atendimento (e cascata: nota clinica, registro financeiro, presenca). */
export async function deleteAppointment(id: ID): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const appt = await db.getFirstAsync<{ schedule_id: number | null }>(
      "SELECT schedule_id FROM appointments WHERE id = ?",
      [id]
    );
    if (!appt) return;

    await db.runAsync("DELETE FROM attendance WHERE appointment_id = ?", [id]);
    await db.runAsync("DELETE FROM clinical_notes WHERE appointment_id = ?", [id]);
    await db.runAsync("DELETE FROM financial_records WHERE appointment_id = ?", [id]);

    if (appt.schedule_id) {
      await db.runAsync(
        "UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
        [id]
      );
    } else {
      await db.runAsync("DELETE FROM appointments WHERE id = ?", [id]);
    }
  });
}
