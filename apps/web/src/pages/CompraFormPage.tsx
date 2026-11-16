import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError } from "../lib/errors";
import { formatoMoneda, hoyISO } from "../lib/format";
import type { Bien, Consumible, Paginado } from "../types";

interface DetalleForm {
  key: string;
  tipo: "CONSUMIBLE" | "BIEN";
  id: string;
  cantidad: string;
  precioUnitario: string;
  descripcion: string;
}

function nuevoDetalle(): DetalleForm {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tipo: "CONSUMIBLE",
    id: "",
    cantidad: "1",
    precioUnitario: "",
    descripcion: "",
  };
}

export function CompraFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(hoyISO());
  const [proveedor, setProveedor] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState("");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [detalles, setDetalles] = useState<DetalleForm[]>([nuevoDetalle()]);
  const [error, setError] = useState("");

  const { data: consumibles, error: errorConsumibles } = useQuery<Paginado<Consumible>>({
    queryKey: ["consumibles-compra"],
    queryFn: async () =>
      (
        await api.get("/consumibles", {
          params: { limit: 100, activo: "true" },
        })
      ).data,
  });

  const { data: bienes, error: errorBienes } = useQuery<Paginado<Bien>>({
    queryKey: ["bienes-compra"],
    queryFn: async () =>
      (
        await api.get("/bienes", {
          params: { limit: 100, activo: "true" },
        })
      ).data,
  });

  const errorCatalogos = errorConsumibles || errorBienes;

  const actualizar = (key: string, cambios: Partial<DetalleForm>) => {
    setDetalles((actuales) =>
      actuales.map((detalle) =>
        detalle.key === key ? { ...detalle, ...cambios } : detalle,
      ),
    );
  };

  const total = detalles.reduce(
    (suma, detalle) =>
      suma + Number(detalle.cantidad || 0) * Number(detalle.precioUnitario || 0),
    0,
  );

  const guardar = useMutation({
    mutationFn: async () => {
      if (detalles.length === 0) {
        throw new Error("Agregá al menos un ítem");
      }

      const payloadDetalles = detalles.map((detalle) => {
        if (!detalle.id) {
          throw new Error("Seleccioná un bien o consumible en cada ítem");
        }

        const cantidad = Number(detalle.cantidad);
        if (!(cantidad > 0)) {
          throw new Error("La cantidad de cada ítem debe ser mayor a cero");
        }

        return {
          ...(detalle.tipo === "CONSUMIBLE"
            ? { consumibleId: Number(detalle.id) }
            : { bienId: Number(detalle.id) }),
          cantidad,
          precioUnitario: detalle.precioUnitario
            ? Number(detalle.precioUnitario)
            : null,
          descripcion: detalle.descripcion.trim() || null,
        };
      });

      return (
        await api.post("/compras", {
          fecha: new Date(`${fecha}T12:00:00`).toISOString(),
          proveedor: proveedor.trim() || null,
          tipoComprobante: tipoComprobante.trim() || null,
          numeroComprobante: numeroComprobante.trim() || null,
          observaciones: observaciones.trim() || null,
          detalles: payloadDetalles,
        })
      ).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["compras"] });
      await queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      await queryClient.invalidateQueries({ queryKey: ["consumibles-compra"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const Swal = (await import("sweetalert2")).default;
      await Swal.fire({
        icon: "success",
        title: "Compra registrada",
        confirmButtonColor: "#0f4c3a",
        timer: 1400,
        showConfirmButton: false,
      });
      navigate("/compras");
    },
    onError: (err) => {
      setError("");
      void alertaError(err);
    },
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/compras")}>
          Volver
        </Button>
      </Box>

      <Box>
        <Typography variant="h4">Nueva compra o ingreso</Typography>
        <Typography color="text.secondary">
          Registrá la cabecera y los ítems. Los consumibles actualizan stock
          automáticamente.
        </Typography>
      </Box>

      {errorCatalogos && (
        <ErrorCarga
          error={errorCatalogos}
          titulo="No se pudieron cargar los ítems disponibles"
        />
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Datos de la compra
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <TextField
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
            <TextField
              label="Proveedor"
              value={proveedor}
              onChange={(event) => setProveedor(event.target.value)}
            />
            <TextField
              select
              label="Tipo de comprobante"
              value={tipoComprobante}
              onChange={(event) => setTipoComprobante(event.target.value)}
            >
              <MenuItem value="">Sin especificar</MenuItem>
              <MenuItem value="FACTURA">Factura</MenuItem>
              <MenuItem value="REMITO">Remito</MenuItem>
              <MenuItem value="TICKET">Ticket</MenuItem>
              <MenuItem value="OTRO">Otro</MenuItem>
            </TextField>
            <TextField
              label="N° de comprobante"
              value={numeroComprobante}
              onChange={(event) => setNumeroComprobante(event.target.value)}
            />
            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              multiline
              minRows={2}
              sx={{ gridColumn: { md: "1 / -1" } }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}
          >
            <Typography variant="h6">Ítems</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setDetalles((actuales) => [...actuales, nuevoDetalle()])}
            >
              Agregar ítem
            </Button>
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Bien / consumible</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Precio unit.</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {detalles.map((detalle) => (
                  <TableRow key={detalle.key}>
                    <TableCell sx={{ minWidth: 150 }}>
                      <TextField
                        select
                        size="small"
                        value={detalle.tipo}
                        onChange={(event) =>
                          actualizar(detalle.key, {
                            tipo: event.target.value as DetalleForm["tipo"],
                            id: "",
                          })
                        }
                      >
                        <MenuItem value="CONSUMIBLE">Consumible</MenuItem>
                        <MenuItem value="BIEN">Bien</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ minWidth: 230 }}>
                      <TextField
                        select
                        size="small"
                        value={detalle.id}
                        onChange={(event) =>
                          actualizar(detalle.key, { id: event.target.value })
                        }
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {detalle.tipo === "CONSUMIBLE"
                          ? consumibles?.items.map((item) => (
                              <MenuItem key={item.id} value={String(item.id)}>
                                {item.nombre}
                              </MenuItem>
                            ))
                          : bienes?.items.map((item) => (
                              <MenuItem key={item.id} value={String(item.id)}>
                                {item.codigoInventario} · {item.descripcion}
                              </MenuItem>
                            ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ minWidth: 110 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={detalle.cantidad}
                        onChange={(event) =>
                          actualizar(detalle.key, { cantidad: event.target.value })
                        }
                        slotProps={{ htmlInput: { min: 0.001, step: "0.001" } }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 130 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={detalle.precioUnitario}
                        onChange={(event) =>
                          actualizar(detalle.key, {
                            precioUnitario: event.target.value,
                          })
                        }
                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatoMoneda(
                        Number(detalle.cantidad || 0) *
                          Number(detalle.precioUnitario || 0),
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <TextField
                        size="small"
                        value={detalle.descripcion}
                        onChange={(event) =>
                          actualizar(detalle.key, {
                            descripcion: event.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          setDetalles((actuales) =>
                            actuales.filter((item) => item.key !== detalle.key),
                          )
                        }
                        disabled={detalles.length === 1}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "flex-end", mt: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              Total estimado
            </Typography>
            <Typography variant="h6">{formatoMoneda(total)}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={() => navigate("/compras")}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={
            guardar.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending}
        >
          {guardar.isPending ? "Guardando..." : "Registrar compra"}
        </Button>
      </Stack>
    </Stack>
  );
}
