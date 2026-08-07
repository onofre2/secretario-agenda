export const darkColors = {
  background: "#0F172A",
  surface: "#1E293B",
  surfaceLight: "#334155",
  primary: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "#334155",
};

export const lightColors = {
  background: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceLight: "#E2E8F0",
  primary: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#CBD5E1",
};

export type ColorPalette = typeof darkColors;

// Mantido para compatibilidade com arquivos que ainda não migraram para o Context de tema.
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};
