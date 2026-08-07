import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { darkColors, lightColors, ColorPalette } from "../theme/colors";
import { getSetting, setSetting, SETTINGS_KEYS } from "../database/repositories/settingsRepo";

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorPalette;
  toggleTheme: (value: boolean) => Promise<void>;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: darkColors,
  toggleTheme: async () => {},
  loaded: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const theme = await getSetting(SETTINGS_KEYS.THEME);
      setIsDark(theme !== "light");
      setLoaded(true);
    })();
  }, []);

  const toggleTheme = useCallback(async (value: boolean) => {
    setIsDark(value);
    await setSetting(SETTINGS_KEYS.THEME, value ? "dark" : "light");
  }, []);

  const value: ThemeContextValue = {
    isDark,
    colors: isDark ? darkColors : lightColors,
    toggleTheme,
    loaded,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
