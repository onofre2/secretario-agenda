import { getDb } from "../db";
import { Appointment, ID } from "../types";
import { getSetting, setSetting, SETTINGS_KEYS } from "./settingsRepo";

const NOTE_BLOCKS = {
  abertura: [
    (name: string) => `Comparecimento à sessão conforme agendamento de ${name}.`,
    (name: string) => `Atendimento realizado conforme cronograma para ${name}.`,
    (name: string) => `Sessão de fisioterapia realizada conforme programação de ${name}.`,
    (name: string) => `Comparecimento registrado para atendimento de ${name}.`,
    (name: string) => `Atendimento fisioterapêutico iniciado conforme agendamento de ${name}.`,
    (name: string) => `Sessão realizada conforme horário previamente programado para ${name}.`,
    (name: string) => `Comparecimento confirmado para a sessão de fisioterapia de ${name}.`,
    (name: string) => `Atendimento realizado conforme planejamento assistencial de ${name}.`,
  ],
  avaliacao: [
    "Os objetivos terapêuticos foram revisados.",
    "Foi realizada reavaliação do quadro funcional.",
    "Houve revisão da evolução clínica.",
    "As condições apresentadas foram analisadas antes das intervenções.",
    "Foi realizada análise da resposta ao tratamento até o momento.",
    "O quadro funcional foi reavaliado antes do início das condutas.",
    "Foram revisadas as necessidades terapêuticas identificadas.",
    "Houve monitoramento da evolução apresentada desde a última sessão.",
  ],
  intervencao: [
    "Foram executadas as condutas previstas no plano terapêutico.",
    "As intervenções programadas foram realizadas.",
    "Desenvolveram-se as atividades propostas para a sessão.",
    "Aplicaram-se os procedimentos planejados.",
    "As condutas terapêuticas previstas foram desenvolvidas conforme planejamento.",
    "Foram aplicadas as estratégias definidas para a etapa atual do tratamento.",
    "Executaram-se os recursos fisioterapêuticos compatíveis com os objetivos propostos.",
    "O atendimento contemplou as intervenções previstas para a sessão.",
  ],
  encerramento: [
    "Mantendo a continuidade do plano terapêutico.",
    "Dando seguimento ao processo de reabilitação.",
    "Respeitando os objetivos estabelecidos.",
    "Mantendo acompanhamento evolutivo conforme planejamento.",
    "Mantendo seguimento conforme evolução observada.",
    "Dando continuidade às condutas estabelecidas no plano terapêutico.",
    "Preservando a progressão do tratamento conforme planejamento.",
    "Mantendo acompanhamento fisioterapêutico de forma contínua.",
  ],
};

function pickFromBlock(block: string[]): string {
  return block[Math.floor(Math.random() * block.length)];
}

async function pickNoteTemplate(patientName: string): Promise<string> {
  const lastCombo = await getSetting(SETTINGS_KEYS.LAST_NOTE_TEMPLATE);
  let combo: string;
  let attempts = 0;
  do {
    const abertura = NOTE_BLOCKS.abertura[Math.floor(Math.random() * NOTE_BLOCKS.abertura.length)](patientName);
    const avaliacao = pickFromBlock(NOTE_BLOCKS.avaliacao);
    const intervencao = pickFromBlock(NOTE_BLOCKS.intervencao);
    const encerramento = pickFromBlock(NOTE_BLOCKS.encerramento);
    combo = `${abertura} ${avaliacao} ${intervencao} ${encerramento}`;
    attempts++;
  } while (combo === lastCombo && attempts < 5);
  await setSetting(SETTINGS_KEYS.LAST_NOTE_TEMPLATE, combo);
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
