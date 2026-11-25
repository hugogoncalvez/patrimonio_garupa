import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  PRESETS_ETIQUETA,
  configuracionCoincideConPreset,
  validarConfiguracionEtiqueta,
} from "../../lib/etiqueta";
import type { ConfiguracionEtiqueta } from "../../types";
import { SelectorCeldas } from "./SelectorCeldas";

interface ConfiguracionEtiquetaDialogProps {
  open: boolean;
  configuracion: ConfiguracionEtiqueta;
  celda: number;
  guardando: boolean;
  onCeldaChange: (celda: number) => void;
  onClose: () => void;
  onSave: (configuracion: ConfiguracionEtiqueta) => void;
}

type CampoNumerico = Exclude<keyof ConfiguracionEtiqueta, "version">;

export function ConfiguracionEtiquetaDialog({
  open,
  configuracion,
  celda,
  guardando,
  onCeldaChange,
  onClose,
  onSave,
}: ConfiguracionEtiquetaDialogProps) {
  const [form, setForm] = useState<ConfiguracionEtiqueta>(configuracion);

  useEffect(() => {
    if (open) {
      setForm(configuracion);
    }
  }, [open, configuracion]);

  const errores = useMemo(() => validarConfiguracionEtiqueta(form), [form]);
  const presetId = configuracionCoincideConPreset(form);

  const actualizar = (campo: CampoNumerico, valor: string) => {
    setForm((anterior) => ({
      ...anterior,
      [campo]: Number(valor),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Configuración de etiquetas</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Alert severity="info">
            Esta configuración se guarda en tu usuario y se recupera en
            cualquier PC.
          </Alert>

          <TextField
            select
            size="small"
            label="Formato de hoja"
            value={presetId}
            onChange={(event) => {
              const preset = PRESETS_ETIQUETA.find(
                (item) => item.id === event.target.value,
              );
              if (preset) {
                setForm(preset.configuracion);
              }
            }}
          >
            {PRESETS_ETIQUETA.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.nombre}
              </MenuItem>
            ))}
            <MenuItem value="personalizada" disabled>
              Personalizada
            </MenuItem>
          </TextField>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              size="small"
              type="number"
              label="Ancho de hoja (mm)"
              value={form.hojaAnchoMm}
              onChange={(event) =>
                actualizar("hojaAnchoMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 50, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Alto de hoja (mm)"
              value={form.hojaAltoMm}
              onChange={(event) =>
                actualizar("hojaAltoMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 50, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Columnas"
              value={form.columnas}
              onChange={(event) => actualizar("columnas", event.target.value)}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Filas"
              value={form.filas}
              onChange={(event) => actualizar("filas", event.target.value)}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Ancho de etiqueta (mm)"
              value={form.etiquetaAnchoMm}
              onChange={(event) =>
                actualizar("etiquetaAnchoMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 5, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Alto de etiqueta (mm)"
              value={form.etiquetaAltoMm}
              onChange={(event) =>
                actualizar("etiquetaAltoMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 5, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Margen superior (mm)"
              value={form.margenSuperiorMm}
              onChange={(event) =>
                actualizar("margenSuperiorMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Margen izquierdo (mm)"
              value={form.margenIzquierdoMm}
              onChange={(event) =>
                actualizar("margenIzquierdoMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Separación horizontal (mm)"
              value={form.separacionXMm}
              onChange={(event) =>
                actualizar("separacionXMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Separación vertical (mm)"
              value={form.separacionYMm}
              onChange={(event) =>
                actualizar("separacionYMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Ajuste fino X (mm)"
              value={form.ajusteXMm}
              onChange={(event) => actualizar("ajusteXMm", event.target.value)}
              slotProps={{ htmlInput: { step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Ajuste fino Y (mm)"
              value={form.ajusteYMm}
              onChange={(event) => actualizar("ajusteYMm", event.target.value)}
              slotProps={{ htmlInput: { step: 1 } }}
            />
            <TextField
              size="small"
              type="number"
              label="Tamaño del QR (mm)"
              value={form.qrTamanoMm}
              onChange={(event) =>
                actualizar("qrTamanoMm", event.target.value)
              }
              slotProps={{ htmlInput: { min: 5, step: 1 } }}
            />
          </Box>

          {errores.length > 0 && (
            <Alert severity="warning">
              {errores.map((error) => (
                <Typography key={error} variant="body2">
                  {error}
                </Typography>
              ))}
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Vista previa y celda inicial de impresión
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Podés elegir desde qué celda empezar. Esta selección no se guarda
              con la configuración.
            </Typography>
            <SelectorCeldas
              configuracion={form}
              celda={celda}
              onCeldaChange={onCeldaChange}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => onSave(form)}
          disabled={guardando || errores.length > 0}
        >
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
