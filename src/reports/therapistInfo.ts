import { getSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";

export interface TherapistInfo {
  name: string | null;
  profession: string | null;
  registration: string | null;
}

export async function getTherapistInfo(): Promise<TherapistInfo> {
  const [name, profession, registration] = await Promise.all([
    getSetting(SETTINGS_KEYS.THERAPIST_NAME),
    getSetting(SETTINGS_KEYS.THERAPIST_PROFESSION),
    getSetting(SETTINGS_KEYS.THERAPIST_REGISTRATION),
  ]);
  return { name, profession, registration };
}

export function buildTherapistFooterHtml(info: TherapistInfo): string {
  if (!info.name && !info.profession && !info.registration) return "";
  const parts = [info.name, info.profession, info.registration].filter(Boolean);
  return `<div style="margin-top:24px; padding-top:12px; border-top:1px solid #E2E8F0; font-size:11px; color:#64748B; text-align:center;">${parts.join(" · ")}</div>`;
}
