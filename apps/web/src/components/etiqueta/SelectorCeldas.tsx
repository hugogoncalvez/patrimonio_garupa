import { Box, ButtonBase, Typography } from "@mui/material";
import { posicionCelda, totalCeldas } from "../../lib/etiqueta";
import type { ConfiguracionEtiqueta } from "../../types";

interface SelectorCeldasProps {
  configuracion: ConfiguracionEtiqueta;
  celda: number;
  onCeldaChange?: (celda: number) => void;
  soloLectura?: boolean;
}

export function SelectorCeldas({
  configuracion,
  celda,
  onCeldaChange,
  soloLectura = false,
}: SelectorCeldasProps) {
  const total = totalCeldas(configuracion);
  const celdaActual = Math.min(Math.max(1, celda), total);

  if (
    !Number.isFinite(configuracion.hojaAnchoMm) ||
    !Number.isFinite(configuracion.hojaAltoMm) ||
    configuracion.hojaAnchoMm <= 0 ||
    configuracion.hojaAltoMm <= 0 ||
    total < 1
  ) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 340,
        aspectRatio: `${configuracion.hojaAnchoMm} / ${configuracion.hojaAltoMm}`,
        bgcolor: "grey.100",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: total }, (_, indice) => {
        const numero = indice + 1;
        const posicion = posicionCelda(configuracion, numero);
        const seleccionada = numero === celdaActual;
        const salteada = numero < celdaActual;

        return (
          <ButtonBase
            key={numero}
            type="button"
            disabled={soloLectura}
            aria-label={`Celda ${numero}`}
            aria-pressed={seleccionada}
            onClick={() => onCeldaChange?.(numero)}
            sx={{
              position: "absolute",
              left: `${(posicion.x / configuracion.hojaAnchoMm) * 100}%`,
              top: `${(posicion.y / configuracion.hojaAltoMm) * 100}%`,
              width: `${(configuracion.etiquetaAnchoMm / configuracion.hojaAnchoMm) * 100}%`,
              height: `${(configuracion.etiquetaAltoMm / configuracion.hojaAltoMm) * 100}%`,
              boxSizing: "border-box",
              border: "1px solid",
              borderColor: seleccionada ? "primary.main" : "divider",
              bgcolor: seleccionada
                ? "primary.main"
                : salteada
                  ? "action.disabledBackground"
                  : "background.paper",
              color: seleccionada ? "primary.contrastText" : "text.secondary",
              fontSize: 11,
              lineHeight: 1,
              cursor: soloLectura ? "default" : "pointer",
              "&:hover": soloLectura
                ? undefined
                : { bgcolor: seleccionada ? "primary.dark" : "action.hover" },
              "&.Mui-disabled": { opacity: 1 },
            }}
          >
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 600 }}>
              {numero}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
