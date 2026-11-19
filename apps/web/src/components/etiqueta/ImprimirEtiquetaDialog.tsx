import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  PRESETS_ETIQUETA,
  configuracionCoincideConPreset,
  totalCeldas,
} from "../../lib/etiqueta";
import type { ConfiguracionEtiqueta } from "../../types";
import { SelectorCeldas } from "./SelectorCeldas";

interface ImprimirEtiquetaDialogProps {
  open: boolean;
  configuracion: ConfiguracionEtiqueta;
  celda: number;
  onCeldaChange: (celda: number) => void;
  onClose: () => void;
  onConfigurar: () => void;
  onImprimir: () => void;
  onCalibrar: () => void;
}

export function ImprimirEtiquetaDialog({
  open,
  configuracion,
  celda,
  onCeldaChange,
  onClose,
  onConfigurar,
  onImprimir,
  onCalibrar,
}: ImprimirEtiquetaDialogProps) {
  const total = totalCeldas(configuracion);
  const celdaActual = Math.min(Math.max(1, celda), total);
  const presetId = configuracionCoincideConPreset(configuracion);
  const preset = PRESETS_ETIQUETA.find((item) => item.id === presetId);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Imprimir etiqueta</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {preset?.nombre ?? "Configuración personalizada"}
          </Typography>

          <Alert severity="info">
            En el diálogo de impresión elegí escala 100%, márgenes ninguno y
            desactivá encabezados y pies de página.
          </Alert>

          <Typography variant="subtitle2">
            Elegí la celda donde querés imprimir
          </Typography>

          <SelectorCeldas
            configuracion={configuracion}
            celda={celdaActual}
            onCeldaChange={onCeldaChange}
          />

          <Typography variant="body2">
            Celda {celdaActual} de {total}. Las celdas anteriores quedarán
            vacías.
          </Typography>

          <Button variant="text" onClick={onConfigurar} sx={{ alignSelf: "flex-start" }}>
            Configurar hoja
          </Button>

          <Button
            variant="outlined"
            onClick={onCalibrar}
            sx={{ alignSelf: "flex-start" }}
          >
            Imprimir prueba de calibración
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onImprimir}>
          Imprimir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
