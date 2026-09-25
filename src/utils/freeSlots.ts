export interface WorkDay {
  weekday: number; // 0 = domingo ... 6 = sabado
  enabled: boolean;
  start: string; // "08:00"
  end: string;   // "19:00"
}

export interface BusySlot {
  weekday: number;
  time: string; // "HH:MM"
}

export interface DayFreeSlots {
  weekday: number;
  slots: string[];  // horarios livres, ex ["08:00", "11:00"]
  allBusy: boolean; // true quando o dia esta totalmente preenchido
}

export const DEFAULT_WORK_HOURS: WorkDay[] = [
  { weekday: 1, enabled: true, start: "08:00", end: "19:00" },
  { weekday: 2, enabled: true, start: "08:00", end: "19:00" },
  { weekday: 3, enabled: true, start: "08:00", end: "19:00" },
  { weekday: 4, enabled: true, start: "08:00", end: "19:00" },
  { weekday: 5, enabled: true, start: "08:00", end: "19:00" },
  { weekday: 6, enabled: false, start: "08:00", end: "12:00" },
  { weekday: 0, enabled: false, start: "08:00", end: "12:00" },
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Cruza a grade de trabalho configurada com os horarios ja ocupados na agenda
 * e devolve, por dia, os blocos de 1 hora que continuam livres.
 */
export function calculateFreeSlots(workHours: WorkDay[], busy: BusySlot[]): DayFreeSlots[] {
  const busyByDay = new Map<number, Set<number>>();
  for (const b of busy) {
    if (!busyByDay.has(b.weekday)) busyByDay.set(b.weekday, new Set());
    busyByDay.get(b.weekday)!.add(toMinutes(b.time));
  }

  return workHours
    .filter((w) => w.enabled)
    .map((w) => {
      const startMin = toMinutes(w.start);
      const endMin = toMinutes(w.end);
      const taken = busyByDay.get(w.weekday) ?? new Set<number>();
      const slots: string[] = [];

      for (let t = startMin; t + 60 <= endMin; t += 60) {
        const occupied = Array.from(taken).some((b) => b >= t && b < t + 60);
        if (!occupied) slots.push(toHHMM(t));
      }

      return { weekday: w.weekday, slots, allBusy: slots.length === 0 };
    });
}

const SHORT_DAY = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

/** Monta o texto resumido da notificacao semanal de horarios livres. */
export function buildFreeSlotsMessage(days: DayFreeSlots[]): string {
  if (days.length === 0) return "Nenhum dia de trabalho configurado.";
  return days
    .map((d) => {
      const name = SHORT_DAY[d.weekday] ?? String(d.weekday);
      if (d.allBusy) return `${name}: cheio`;
      return `${name}: ${d.slots.map((s) => s.replace(":00", "h")).join(", ")}`;
    })
    .join("  •  ");
}
