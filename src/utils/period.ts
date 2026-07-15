function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export type PeriodKind = "day" | "week" | "month" | "year";

export interface DateRange {
  start: string;
  end: string;
  label: string;
}

/** Calcula o intervalo [início, fim] (formato YYYY-MM-DD) para o período pedido, relativo a hoje. */
export function getRangeFor(period: PeriodKind): DateRange {
  const now = new Date();

  if (period === "day") {
    const iso = toISO(now);
    return { start: iso, end: iso, label: "Hoje" };
  }

  if (period === "week") {
    const day = now.getDay(); // 0 = domingo
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: toISO(monday), end: toISO(sunday), label: "Esta semana" };
  }

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthName = now.toLocaleDateString("pt-BR", { month: "long" });

  if (period === "month") {
    return {
      start: toISO(firstDay),
      end: toISO(lastDay),
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
    };
  }

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  return { start: toISO(yearStart), end: toISO(yearEnd), label: String(now.getFullYear()) };
}
