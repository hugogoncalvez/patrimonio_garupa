import { IconButton, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useThemeMode } from "../themeMode";

export function ThemeToggle({ sx }: { sx?: SxProps<Theme> }) {
  const { mode, toggle } = useThemeMode();
  const esOscuro = mode === "dark";
  const etiqueta = esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <Tooltip title={etiqueta}>
      <IconButton
        color="inherit"
        aria-label={etiqueta}
        onClick={toggle}
        sx={sx}
      >
        {esOscuro ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
