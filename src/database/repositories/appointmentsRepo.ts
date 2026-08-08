import { getDb } from "../db";
import { Appointment, ID, NoteProfile } from "../types";
import { getSetting, setSetting, SETTINGS_KEYS } from "./settingsRepo";
import * as Notifications from "expo-notifications";

const PROFILE_BLOCKS: Record<NoteProfile, {
  abertura: ((name: string) => string)[];
  b2: string[];
  b3: string[];
  b4: string[];
}> = {
  default: {
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
    b2: [
      "Antes das condutas, foi feita a revisão do quadro clínico atual.",
      "Observou-se a evolução do paciente desde o último atendimento.",
      "Foi verificada a resposta às intervenções anteriores.",
      "O quadro funcional foi analisado no início do atendimento.",
      "Identificaram-se as necessidades terapêuticas do momento.",
      "Houve breve reavaliação dos sintomas apresentados.",
      "Avaliou-se o progresso alcançado até a presente sessão.",
      "Levantou-se o estado atual do paciente para direcionar a conduta.",
    ],
    b3: [
      "Foram aplicadas técnicas específicas para o quadro apresentado.",
      "Realizaram-se exercícios terapêuticos direcionados aos objetivos propostos.",
      "Executou-se o protocolo de tratamento estabelecido.",
      "Foram conduzidas as atividades previstas para esta etapa.",
      "Trabalhou-se com os recursos indicados para o caso.",
      "Desenvolveu-se a sessão com foco nas metas definidas.",
      "Aplicaram-se manobras e exercícios conforme necessidade identificada.",
      "Realizou-se o atendimento com as técnicas apropriadas ao momento.",
    ],
    b4: [
      "O paciente segue em acompanhamento regular.",
      "Tratamento será mantido nas próximas sessões.",
      "Progressão terapêutica dentro do esperado.",
      "Segue-se com o plano de reabilitação estabelecido.",
      "Continuidade assegurada até a próxima avaliação.",
      "Evolução positiva, com manutenção da conduta atual.",
      "Novo encontro previsto para dar seguimento ao tratamento.",
      "Plano terapêutico será revisado conforme evolução futura.",
    ],
  },
  neuro: {
    abertura: [
      (name: string) => `Atendimento realizado com ${name}, com foco no neurodesenvolvimento motor.`,
      (name: string) => `Sessão de ${name} direcionada ao desenvolvimento das habilidades motoras funcionais.`,
      (name: string) => `Realizado atendimento fisioterapêutico com ${name}, com abordagem voltada à psicomotricidade.`,
      (name: string) => `Sessão de ${name} estruturada a partir de atividades motoras lúdicas.`,
      (name: string) => `Durante o atendimento de ${name}, foram trabalhadas habilidades relacionadas ao desenvolvimento motor.`,
      (name: string) => `Realizadas com ${name} atividades terapêuticas direcionadas à organização das habilidades motoras.`,
      (name: string) => `Atendimento de ${name} conduzido por meio de propostas lúdicas e funcionais.`,
      (name: string) => `Sessão de ${name} voltada à estimulação das capacidades motoras globais e específicas.`,
    ],
    b2: [
      "Foram trabalhados marcha, equilíbrio e coordenação motora global.",
      "Foram trabalhados planejamento motor, controle corporal e organização espacial.",
      "Foram trabalhados coordenação bilateral, equilíbrio dinâmico e deslocamento.",
      "Foram trabalhados motricidade fina, coordenação e habilidades manipulativas.",
      "Foram trabalhados controle postural, equilíbrio e ajustes durante a marcha.",
      "Foram trabalhados praxia, coordenação global e organização dos movimentos.",
      "Foram trabalhadas habilidades motoras finas e globais de forma integrada.",
      "Foram trabalhados diferentes padrões de deslocamento, coordenação e planejamento motor.",
    ],
    b3: [
      "por meio de circuito motor com obstáculos variados.",
      "através de brincadeiras dirigidas e desafios motores progressivos.",
      "utilizando percurso funcional com mudanças de direção.",
      "associando atividades motoras a tarefas de manipulação e precisão.",
      "com propostas que exigiam sequência e organização dos movimentos.",
      "utilizando atividades lúdicas com diferentes níveis de dificuldade.",
      "por meio de desafios motores associados a comandos durante a execução.",
      "integrando atividades de coordenação fina e global em diferentes etapas.",
    ],
    b4: [
      "com progressão da dificuldade conforme a execução apresentada.",
      "respeitando o desempenho observado durante as atividades.",
      "com adequação dos desafios de acordo com a resposta motora apresentada.",
      "incluindo momentos de dupla tarefa para ampliar a demanda de coordenação e atenção.",
      "aumentando gradualmente a complexidade das tarefas propostas.",
      "favorecendo maior organização e adaptação da resposta motora.",
      "ajustando as atividades conforme necessidade observada durante a sessão.",
      "mantendo abordagem lúdica e progressiva ao longo do atendimento.",
    ],
  },
  ortho: {
    abertura: [
      (name: string) => `Atendimento fisioterapêutico com ${name}, direcionado à recuperação funcional.`,
      (name: string) => `Sessão de ${name} realizada com foco na funcionalidade e no movimento.`,
      (name: string) => `Realizado atendimento com ${name}, com abordagem voltada à recuperação da capacidade funcional.`,
      (name: string) => `Sessão de ${name} direcionada ao tratamento fisioterapêutico e à melhora do desempenho motor.`,
      (name: string) => `Atendimento de ${name} realizado com foco na recuperação dos movimentos e das funções comprometidas.`,
      (name: string) => `Sessão de ${name} estruturada de acordo com as necessidades funcionais apresentadas.`,
      (name: string) => `Realizado com ${name} trabalho fisioterapêutico direcionado à evolução funcional.`,
      (name: string) => `Atendimento de ${name} conduzido com foco na reabilitação e no retorno progressivo às atividades.`,
    ],
    b2: [
      "Foram trabalhados mobilidade articular, amplitude de movimento e controle motor.",
      "Foram estimulados força muscular, estabilidade articular e controle do movimento.",
      "Foram trabalhados alongamento, mobilidade e fortalecimento da musculatura envolvida.",
      "Foram abordados equilíbrio, propriocepção e controle durante os movimentos funcionais.",
      "Foram realizadas atividades voltadas à recuperação da força, mobilidade e funcionalidade.",
      "Foram trabalhados padrões de movimento, estabilidade e controle corporal.",
      "Foram estimuladas capacidades relacionadas à força, flexibilidade e coordenação motora.",
      "Foram abordados aspectos de mobilidade, resistência muscular e desempenho funcional.",
    ],
    b3: [
      "por meio de exercícios terapêuticos específicos e atividades funcionais.",
      "utilizando exercícios ativos, resistidos e movimentos direcionados.",
      "através de atividades progressivas de acordo com a capacidade apresentada.",
      "com exercícios de mobilidade, fortalecimento e controle motor.",
      "utilizando tarefas funcionais associadas a exercícios terapêuticos.",
      "por meio de exercícios graduados e estímulos proprioceptivos.",
      "associando exercícios específicos a movimentos relacionados às atividades funcionais.",
      "com propostas terapêuticas progressivas e adequadas ao desempenho apresentado.",
    ],
    b4: [
      "apresentando evolução compatível com os objetivos terapêuticos propostos.",
      "com ajuste da intensidade conforme resposta apresentada durante a sessão.",
      "respeitando os limites funcionais observados durante a execução.",
      "com progressão dos exercícios conforme tolerância e desempenho.",
      "mantendo atenção à qualidade do movimento durante as atividades.",
      "com adaptação das tarefas de acordo com a necessidade identificada.",
      "buscando ampliar gradualmente a independência e a funcionalidade.",
      "mantendo progressão terapêutica de acordo com a resposta apresentada.",
    ],
  },
  elderly: {
    abertura: [
      (name: string) => `Atendimento fisioterapêutico com ${name}, direcionado à manutenção e melhora da funcionalidade.`,
      (name: string) => `Sessão de ${name} realizada com foco na capacidade funcional e independência durante as atividades.`,
      (name: string) => `Realizado atendimento com ${name}, voltado à mobilidade e ao desempenho funcional.`,
      (name: string) => `Sessão de ${name} direcionada ao aprimoramento das habilidades motoras necessárias às atividades diárias.`,
      (name: string) => `Atendimento de ${name} realizado com foco na preservação da autonomia e capacidade de movimento.`,
      (name: string) => `Sessão de ${name} estruturada de acordo com as demandas funcionais apresentadas.`,
      (name: string) => `Realizado com ${name} trabalho fisioterapêutico visando manutenção da mobilidade e desempenho motor.`,
      (name: string) => `Atendimento de ${name} conduzido com foco na funcionalidade, mobilidade e segurança durante os movimentos.`,
    ],
    b2: [
      "Foram trabalhados equilíbrio, força muscular e controle postural.",
      "Foram estimulados marcha, mobilidade funcional e coordenação motora.",
      "Foram trabalhadas força de membros inferiores, equilíbrio e transferências.",
      "Foram estimulados mobilidade articular, estabilidade e controle corporal.",
      "Foram trabalhados equilíbrio estático e dinâmico, além da coordenação motora.",
      "Foram abordados força muscular, resistência e capacidade funcional.",
      "Foram estimuladas habilidades relacionadas à marcha, mudanças de posição e controle postural.",
      "Foram trabalhados deslocamentos, equilíbrio e estratégias motoras durante tarefas funcionais.",
    ],
    b3: [
      "por meio de exercícios terapêuticos associados a atividades funcionais.",
      "utilizando circuito motor adaptado e tarefas relacionadas às atividades diárias.",
      "através de exercícios progressivos de força, equilíbrio e mobilidade.",
      "com atividades de deslocamento, transferência e controle postural.",
      "utilizando exercícios ativos e tarefas funcionais de dificuldade graduada.",
      "por meio de atividades direcionadas à marcha e ao equilíbrio.",
      "associando fortalecimento muscular a desafios de coordenação e estabilidade.",
      "com propostas funcionais adaptadas à capacidade e segurança durante a execução.",
    ],
    b4: [
      "com progressão dos desafios conforme desempenho e tolerância apresentados.",
      "respeitando as condições funcionais observadas durante o atendimento.",
      "com adequação da intensidade de acordo com a resposta apresentada.",
      "buscando favorecer maior segurança e independência nas atividades funcionais.",
      "mantendo estímulos compatíveis com a capacidade apresentada durante a sessão.",
      "com evolução gradual da complexidade das tarefas propostas.",
      "priorizando qualidade do movimento, segurança e autonomia funcional.",
      "com ajustes realizados conforme necessidade e desempenho observado.",
    ],
  },
};

function pickFromBlock(block: string[]): string {
  return block[Math.floor(Math.random() * block.length)];
}

async function pickNoteTemplate(patientName: string, profile: NoteProfile): Promise<string> {
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
    const blocks = PROFILE_BLOCKS[profile];
    const abertura = blocks.abertura[Math.floor(Math.random() * blocks.abertura.length)](patientName);
    const b2 = pickFromBlock(blocks.b2);
    const b3 = pickFromBlock(blocks.b3);
    const b4 = pickFromBlock(blocks.b4);
    combo = `${abertura} ${b2} ${b3} ${b4}`;
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
    const appt = await db.getFirstAsync<Appointment & { patient_name: string; note_profile: NoteProfile }>(
      `SELECT a.*, p.full_name as patient_name, p.note_profile as note_profile
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

    const draft = await pickNoteTemplate(appt.patient_name, appt.note_profile);

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
