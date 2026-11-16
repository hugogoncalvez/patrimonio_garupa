import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { api } from "../lib/api";
import { alertaError, alertaExito, confirmar } from "../lib/errors";
import { formatoFecha, hoyISO } from "../lib/format";
import type { Documento } from "../types";

const tipos = [
  { value: "FACTURA", label: "Factura" },
  { value: "REMITO", label: "Remito" },
  { value: "ACTA", label: "Acta" },
  { value: "RESOLUCION", label: "Resolución" },
  { value: "OTRO", label: "Otro" },
];

const tipoLabel = (tipo: string) =>
  tipos.find((item) => item.value === tipo)?.label ?? tipo;

export function DocumentosBien({
  bienId,
  documentos,
  onChanged,
}: {
  bienId: number;
  documentos: Documento[];
  onChanged: () => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("FACTURA");
  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [archivo, setArchivo] = useState<File | null>(null);

  const subir = useMutation({
    mutationFn: async () => {
      if (!archivo) throw new Error("Seleccioná un archivo");
      const datos = new FormData();
      datos.append("archivo", archivo);
      datos.append("tipo", tipo);
      datos.append("bienId", String(bienId));
      if (numero.trim()) datos.append("numero", numero.trim());
      if (fecha) {
        datos.append("fecha", new Date(`${fecha}T12:00:00`).toISOString());
      }
      return (await api.post("/documentos", datos)).data;
    },
    onSuccess: async () => {
      setAbierto(false);
      setArchivo(null);
      setNumero("");
      setTipo("FACTURA");
      await onChanged();
      await alertaExito("Documento adjuntado");
    },
    onError: alertaError,
  });

  const eliminar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/documentos/${id}`)).data,
    onSuccess: async () => {
      await onChanged();
      await alertaExito("Documento eliminado");
    },
    onError: alertaError,
  });

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAbierto(true)}
        >
          Adjuntar documento
        </Button>
      </Box>

      {documentos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin documentación adjunta.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Número</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Archivo</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documentos.map((documento) => (
              <TableRow key={documento.id} hover>
                <TableCell>{tipoLabel(documento.tipo)}</TableCell>
                <TableCell>{documento.numero ?? "-"}</TableCell>
                <TableCell>{formatoFecha(documento.fecha)}</TableCell>
                <TableCell>
                  <Link
                    href={documento.archivoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {documento.nombreArchivo}
                  </Link>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (
                        await confirmar(
                          "Eliminar documento",
                          `¿Eliminar ${documento.nombreArchivo}?`,
                        )
                      ) {
                        eliminar.mutate(documento.id);
                      }
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={abierto} onClose={() => setAbierto(false)} fullWidth maxWidth="sm">
        <DialogTitle>Adjuntar documento</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Tipo"
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
            >
              {tipos.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Número"
              value={numero}
              onChange={(event) => setNumero(event.target.value)}
            />
            <TextField
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button variant="outlined" component="label">
              {archivo ? archivo.name : "Seleccionar archivo"}
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(event) =>
                  setArchivo(event.target.files?.[0] ?? null)
                }
              />
            </Button>
            <Typography variant="caption" color="text.secondary">
              Tamaño máximo: 15 MB.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAbierto(false)}
            disabled={subir.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => subir.mutate()}
            disabled={!archivo || subir.isPending}
            startIcon={
              subir.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
          >
            {subir.isPending ? "Subiendo..." : "Subir"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
