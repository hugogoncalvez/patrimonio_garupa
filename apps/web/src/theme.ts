import { alpha, createTheme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

export function crearTema(mode: ThemeMode) {
  const esOscuro = mode === "dark";
  const primaryMain = esOscuro ? "#7bc9a6" : "#0f4c3a";

  return createTheme({
    palette: {
      mode,
      primary: esOscuro
        ? {
            main: primaryMain,
            light: "#a2e0c3",
            dark: "#4f9b7a",
            contrastText: "#07130e",
          }
        : {
            main: primaryMain,
            light: "#3f7a64",
            dark: "#083528",
            contrastText: "#ffffff",
          },
      secondary: esOscuro
        ? {
            main: "#e0c06a",
            light: "#f0d99a",
            dark: "#a98a35",
            contrastText: "#1f1a0d",
          }
        : {
            main: "#c49a3a",
            light: "#d8b86a",
            dark: "#8e6c1f",
            contrastText: "#1f1a0d",
          },
      background: esOscuro
        ? {
            default: "#0b1210",
            paper: "#141e19",
          }
        : {
            default: "#f4f6f5",
            paper: "#ffffff",
          },
      ...(esOscuro
        ? {
            text: {
              primary: "#e8f0eb",
              secondary: "#a5b8ad",
              disabled: "rgba(232, 240, 235, 0.45)",
            },
          }
        : {}),
      divider: esOscuro ? "rgba(232, 240, 235, 0.12)" : "rgba(15, 76, 58, 0.10)",
      success: { main: esOscuro ? "#81c784" : "#2e7d32" },
      warning: { main: esOscuro ? "#ffb74d" : "#ed6c02" },
      error: { main: esOscuro ? "#ff8a80" : "#c62828" },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: [
        "Inter",
        "Roboto",
        "system-ui",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "sans-serif",
      ].join(","),
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          ".swal2-popup": {
            backgroundColor: esOscuro ? "#141e19" : "#ffffff",
            color: esOscuro ? "#e8f0eb" : "#1f2933",
          },
          ".swal2-title": {
            color: esOscuro ? "#e8f0eb" : "#1f2933",
          },
          ".swal2-html-container": {
            color: esOscuro ? "#a5b8ad" : "#52606d",
          },
          ".swal2-input, .swal2-textarea": {
            backgroundColor: esOscuro ? "#0b1210" : "#ffffff",
            color: esOscuro ? "#e8f0eb" : "#1f2933",
            borderColor: esOscuro ? "rgba(232, 240, 235, 0.24)" : undefined,
          },
          ".swal2-validation-message": {
            backgroundColor: esOscuro ? "#2a1d16" : undefined,
            color: esOscuro ? "#ffccbc" : undefined,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${
              esOscuro ? "rgba(232, 240, 235, 0.10)" : "rgba(15, 76, 58, 0.08)"
            }`,
            boxShadow: esOscuro
              ? "0 10px 30px rgba(0, 0, 0, 0.28)"
              : "0 6px 24px rgba(15, 76, 58, 0.06)",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            backgroundColor: esOscuro ? alpha(primaryMain, 0.14) : "#eef3f0",
          },
        },
      },
    },
  });
}
