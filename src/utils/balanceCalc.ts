export interface MonthValue {
  month: string; // "YYYY-MM"
  value: number;
}

export interface MonthComparison {
  month: string;
  value: number;
  previousValue: number | null;
  changePct: number | null; // null se não houver mês anterior
}

/**
 * Calcula a variação percentual mês a mês (MoM) para uma série de valores mensais.
 * Espera a lista já ordenada por mês crescente.
 */
export function calculateMonthOverMonth(series: MonthValue[]): MonthComparison[] {
  return series.map((point, index) => {
    if (index === 0) {
      return { month: point.month, value: point.value, previousValue: null, changePct: null };
    }
    const previous = series[index - 1].value;
    const changePct = previous > 0 ? ((point.value - previous) / previous) * 100 : null;
    return { month: point.month, value: point.value, previousValue: previous, changePct };
  });
}

export type ProjectionConfidence = "baixa" | "moderada" | "alta";

export interface Projection {
  nextMonth: string; // "YYYY-MM"
  estimate: number;
  low: number;
  high: number;
  confidence: ProjectionConfidence;
}

/**
 * Projeta o valor do próximo mês usando regressão linear simples (mínimos quadrados)
 * sobre os últimos N meses. Retorna null se houver menos de 2 meses de histórico.
 */
export function calculateProjection(series: MonthValue[]): Projection | null {
  if (series.length < 2) return null;

  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.value);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  const nextX = n;
  const estimate = Math.max(intercept + slope * nextX, 0);

  const residuals = ys.map((y, i) => y - (intercept + slope * xs[i]));
  const stdDev = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / n);

  const low = Math.max(estimate - stdDev, 0);
  const high = estimate + stdDev;

  let confidence: ProjectionConfidence = "baixa";
  if (n >= 5) confidence = "alta";
  else if (n >= 3) confidence = "moderada";

  const lastMonth = series[series.length - 1].month;
  const [year, month] = lastMonth.split("-").map(Number);
  const nextDate = new Date(year, month, 1); // month já é 1-indexed no input, então isso avança 1 mês
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  return { nextMonth, estimate, low, high, confidence };
}
