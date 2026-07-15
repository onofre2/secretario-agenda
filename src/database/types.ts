// Tipos centrais do Secretário Agenda
// Espelham 1:1 as tabelas do SQLite (schema.ts)

export type ID = number;

export type AttendanceStatus = "pending" | "present" | "absent";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export interface Clinic {
  id: ID;
  name: string;
  address: string | null;
  phone: string | null;
  payment_info: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: ID;
  full_name: string;
  diagnosis: string | null;
  treatment_goals: string | null;
  clinical_history: string | null;
  insurance: string | null;
  default_session_value: number | null;
  phone: string | null;
  email: string | null;
  emergency_contact: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

// Agendamento recorrente semanal (o "molde" que gera Appointments)
export interface Schedule {
  id: ID;
  patient_id: ID;
  clinic_id: ID;
  weekday: Weekday;
  time: string; // "HH:mm"
  session_value: number;
  active: boolean; // false = pausado
  created_at: string;
  updated_at: string;
}

// Uma ocorrência concreta em uma data específica (gerada a partir de Schedule,
// ou criada avulsa)
export interface Appointment {
  id: ID;
  schedule_id: ID | null;
  patient_id: ID;
  clinic_id: ID;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  session_value: number;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: ID;
  appointment_id: ID;
  status: AttendanceStatus;
  registered_at: string; // timestamp real de quando foi marcado
  revenue: number; // valor computado (0 se ausente)
  created_at: string;
}

export interface ClinicalNote {
  id: ID;
  appointment_id: ID;
  patient_id: ID;
  content: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialRecord {
  id: ID;
  appointment_id: ID;
  patient_id: ID;
  clinic_id: ID;
  date: string;
  amount: number;
  type: "revenue" | "loss";
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface NotificationLog {
  id: ID;
  appointment_id: ID;
  scheduled_for: string;
  sent: boolean;
  created_at: string;
}

export interface Backup {
  id: ID;
  file_path: string;
  created_at: string;
}

// DTOs usados ao criar registros (sem campos gerados pelo banco)
export type NewClinic = Omit<Clinic, "id" | "created_at" | "updated_at">;
export type NewPatient = Omit<Patient, "id" | "created_at" | "updated_at">;
export type NewSchedule = Omit<Schedule, "id" | "created_at" | "updated_at">;
export type NewAppointment = Omit<Appointment, "id" | "created_at" | "updated_at">;
