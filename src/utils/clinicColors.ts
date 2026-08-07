export const CLINIC_COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#A855F7", "#14B8A6", "#EF4444", "#84CC16"];

/** Retorna sempre a mesma cor para o mesmo nome de clínica, independente de ordem ou tela. */
export function getClinicColor(clinicName: string): string {
  let hash = 0;
  for (let i = 0; i < clinicName.length; i++) {
    hash = (hash * 31 + clinicName.charCodeAt(i)) >>> 0;
  }
  return CLINIC_COLORS[hash % CLINIC_COLORS.length];
}
