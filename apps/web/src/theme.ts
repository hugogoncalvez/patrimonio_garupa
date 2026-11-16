import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f4c3a",
      light: "#3f7a64",
      dark: "#083528",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#c49a3a",
      light: "#d8b86a",
      dark: "#8e6c1f",
      contrastText: "#1f1a0d",
    },
    background: {
      default: "#f4f6f5",
      paper: "#ffffff",
    },
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
    error: { main: "#c62828" },
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
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(15, 76, 58, 0.08)",
          boxShadow: "0 6px 24px rgba(15, 76, 58, 0.06)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, backgroundColor: "#eef3f0" },
      },
    },
  },
});
