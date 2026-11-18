import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { crearTema, type ThemeMode } from "./theme";

const STORAGE_KEY = "patrimonio-tema";

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function leerModoGuardado(): ThemeMode {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === "light" || guardado === "dark") {
      return guardado;
    }
  } catch {
    return "dark";
  }

  return "dark";
}

function guardarModo(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(leerModoGuardado);
  const theme = useMemo(() => crearTema(mode), [mode]);

  useEffect(() => {
    guardarModo(mode);
    document.documentElement.style.colorScheme = mode;
    document.documentElement.style.backgroundColor =
      mode === "dark" ? "#0b1210" : "#f4f6f5";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", mode === "dark" ? "#0b1210" : "#0f4c3a");
  }, [mode]);

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      mode,
      toggle: () => setMode((actual) => (actual === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error("useThemeMode debe usarse dentro de ThemeModeProvider");
  }

  return context;
}
