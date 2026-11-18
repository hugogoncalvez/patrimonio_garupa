import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import InventoryIcon from "@mui/icons-material/Inventory";
import PrintIcon from "@mui/icons-material/Print";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError } from "../lib/errors";
import { formatoFecha, formatoMoneda, formatoNumero, hoyISO } from "../lib/format";
import type { ActaRecepcion, Compra, CompraDetalle } from "../types";

const estados: Record<
  Compra["estado"],
  { label: string; color: "default" | "warning" | "success" }
> = {
  REGISTRADA: { label: "Pendiente de recepción", color: "warning" },
  RECIBIDA_PARCIAL: { label: "Recepción parcial", color: "warning" },
  RECIBIDA: { label: "Recibida", color: "success" },
};

function pendiente(detalle: CompraDetalle) {
  return Math.max(
    0,
    Number(detalle.cantidad) - Number(detalle.cantidadRecibida),
  );
}

function descripcionDetalle(detalle: CompraDetalle) {
  if (detalle.tipo === "INVENTARIABLE") {
    return detalle.descripcion || detalle.rubro?.nombre || "Bien";
  }
  return detalle.consumible?.nombre || detalle.descripcion || "Consumible";
}

export function CompraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recepcionAbierta, setRecepcionAbierta] = useState(false);
  const [fechaRecepcion, setFechaRecepcion] = useState(hoyISO());
  const [observaciones, setObservaciones] = useState("");
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [actaPdfId, setActaPdfId] = useState<number | null>(null);

  const { data: compra, isLoading, error, refetch } = useQuery<Compra>({
    queryKey: ["compra", id],
    queryFn: async () => (await api.get(`/compras/${id}`)).data,
    enabled: Boolean(id),
  });

  const abrirRecepcion = () => {
    if (!compra) return;
    const iniciales: Record<number, string> = {};
    for (const detalle of compra.detalles) {
      const restante = pendiente(detalle);
      if (restante > 0) iniciales[detalle.id] = String(restante);
    }
    setCantidades(iniciales);
    setFechaRecepcion(hoyISO());
    setObservaciones("");
    setRecepcionAbierta(true);
  };

  const recibir = useMutation({
    mutationFn: async () => {
      const items = Object.entries(cantidades)
        .map(([detalleId, cantidad]) => ({
          compraDetalleId: Number(detalleId),
          cantidad: Number(cantidad),
        }))
        .filter((item) => item.cantidad > 0);

      if (items.length === 0) {
        throw new Error("Ingresá al menos una cantidad a recibir");
      }

      return (
        await api.post(`/compras/${id}/actas`, {
          fecha: new Date(`${fechaRecepcion}T12:00:00`).toISOString(),
          observaciones: observaciones.trim() || null,
          items,
        })
      ).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["compra", id] });
      await queryClient.invalidateQueries({
        queryKey: ["compras"],
        refetchType: "all",
      });
      await queryClient.invalidateQueries({ queryKey: ["bienes"] });
      await queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setRecepcionAbierta(false);
      const Swal = (await import("sweetalert2")).default;
      await Swal.fire({
        icon: "success",
        title: "Recepción registrada",
        confirmButtonColor: "#0f4c3a",
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: alertaError,
  });

  const obtenerActaPdf = async (
    acta: ActaRecepcion,
    descargar: boolean,
  ) => {
    if (!compra) return;
    setActaPdfId(acta.id);
    const ventana = descargar ? null : window.open("", "_blank");

    try {
      const response = await api.get(
        `/compras/${compra.id}/actas/${acta.id}/acta.pdf`,
        {
          params: descargar ? { descargar: "1" } : undefined,
          responseType: "blob",
        },
      );

      const url = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );

      if (descargar) {
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `${acta.numero}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      } else if (ventana) {
        ventana.location.href = url;
      } else {
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      }

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      ventana?.close();
      await alertaError(error);
    } finally {
      setActaPdfId(null);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <ErrorCarga
        error={error}
        onRetry={() => void refetch()}
        titulo="No se pudo cargar la compra"
      />
    );
  }

  if (!compra) {
    return <Alert severity="error">No se encontró la compra.</Alert>;
  }

  const total = compra.detalles.reduce(
    (suma, detalle) =>
      suma + Number(detalle.cantidad) * Number(detalle.precioUnitario ?? 0),
    0,
  );
  const tienePendientes = compra.detalles.some((detalle) => pendiente(detalle) > 0);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/compras")}>
          Volver
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          gap: 2,
          alignItems: { md: "center" },
        }}
      >
        <Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <Typography variant="h4">
              Compra #{compra.id}
              {compra.numeroOrdenPago
                ? ` · OP ${compra.numeroOrdenPago}`
                : ""}
            </Typography>
            <Chip
              size="small"
              label={estados[compra.estado].label}
              color={estados[compra.estado].color}
            />
          </Stack>
          <Typography color="text.secondary">
            {compra.organismo === "DE"
              ? "Departamento Ejecutivo"
              : "Honorable Concejo Deliberante"}{" "}
            · {formatoFecha(compra.fecha)} ·{" "}
            {compra.proveedorDatos?.nombre ?? compra.proveedor ?? "Sin proveedor"}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<InventoryIcon />}
          onClick={abrirRecepcion}
          disabled={!tienePendientes}
        >
          Registrar recepción
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.5fr 1fr" },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ítems
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Recibida</TableCell>
                      <TableCell align="right">Pendiente</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {compra.detalles.map((detalle) => (
                      <TableRow key={detalle.id}>
                        <TableCell>
                          {detalle.tipo === "INVENTARIABLE" ? "Bien" : "Consumible"}
                        </TableCell>
                        <TableCell>
                          {descripcionDetalle(detalle)}
                          {detalle.tipo === "INVENTARIABLE" && detalle.rubro ? (
                            <Typography variant="caption" color="text.secondary">
                              {detalle.rubro.codigoCategoria} · {detalle.rubro.nombre}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell align="right">
                          {formatoNumero(detalle.cantidad)}
                        </TableCell>
                        <TableCell align="right">
                          {formatoNumero(detalle.cantidadRecibida)}
                        </TableCell>
                        <TableCell align="right">
                          {formatoNumero(pendiente(detalle))}
                        </TableCell>
                        <TableCell align="right">
                          {formatoMoneda(detalle.precioUnitario)}
                        </TableCell>
                        <TableCell align="right">
                          {formatoMoneda(
                            Number(detalle.cantidad) *
                              Number(detalle.precioUnitario ?? 0),
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Divider sx={{ my: 2 }} />
              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: "flex-end", alignItems: "center" }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h6">{formatoMoneda(total)}</Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actas de recepción
              </Typography>
              {compra.actasRecepcion.length === 0 ? (
                <Typography color="text.secondary">
                  Todavía no se registró ninguna recepción.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {compra.actasRecepcion.map((acta) => (
                    <Card key={acta.id} variant="outlined">
                      <CardContent>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          sx={{ justifyContent: "space-between" }}
                        >
                          <Typography sx={{ fontWeight: 600 }}>
                            {acta.numero}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatoFecha(acta.fecha)}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ mt: 1.5, flexWrap: "wrap" }}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                              actaPdfId === acta.id ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <PrintIcon />
                              )
                            }
                            onClick={() => void obtenerActaPdf(acta, false)}
                            disabled={actaPdfId === acta.id}
                          >
                            Ver / Imprimir acta
                          </Button>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            onClick={() => void obtenerActaPdf(acta, true)}
                            disabled={actaPdfId === acta.id}
                          >
                            Descargar PDF
                          </Button>
                        </Stack>
                        {acta.detalles?.length ? (
                          <Stack spacing={1} sx={{ mt: 1.5 }}>
                            {acta.detalles.map((detalle) => (
                              <Box key={detalle.id}>
                                <Typography variant="body2">
                                  {formatoNumero(detalle.cantidad)} ×{" "}
                                  {detalle.compraDetalle?.descripcion ??
                                    detalle.compraDetalle?.consumible?.nombre ??
                                    detalle.compraDetalle?.rubro?.nombre ??
                                    "Ítem"}
                                </Typography>
                                {detalle.bienes?.length ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: "block" }}
                                  >
                                    {detalle.bienes
                                      .map((bien) => bien.codigoInventario)
                                      .join(", ")}
                                  </Typography>
                                ) : null}
                              </Box>
                            ))}
                          </Stack>
                        ) : null}
                        {acta.observaciones ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1.5 }}
                          >
                            {acta.observaciones}
                          </Typography>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>

        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comprobantes
              </Typography>
              {compra.comprobantes.length === 0 ? (
                <Typography color="text.secondary">Sin comprobantes.</Typography>
              ) : (
                <Stack spacing={1}>
                  {compra.comprobantes.map((comprobante) => (
                    <Box key={comprobante.id ?? comprobante.numero}>
                      <Typography variant="body2">
                        {comprobante.tipo}
                        {comprobante.numero ? ` · ${comprobante.numero}` : ""}
                      </Typography>
                      {comprobante.fecha ? (
                        <Typography variant="caption" color="text.secondary">
                          {formatoFecha(comprobante.fecha)}
                        </Typography>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Datos administrativos
              </Typography>
              <Stack spacing={1.2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Orden de pago
                  </Typography>
                  <Typography variant="body2">
                    {compra.numeroOrdenPago ?? "-"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Registró
                  </Typography>
                  <Typography variant="body2">
                    {compra.creadoPor
                      ? `${compra.creadoPor.nombre} ${compra.creadoPor.apellido}`
                      : "-"}
                  </Typography>
                </Box>
                {compra.observaciones ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Observaciones
                    </Typography>
                    <Typography variant="body2">{compra.observaciones}</Typography>
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Dialog
        open={recepcionAbierta}
        onClose={() => {
          if (!recibir.isPending) setRecepcionAbierta(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Registrar recepción</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Al confirmar se genera un acta, se crean los bienes con su código
              y se actualiza el stock de los consumibles.
            </Alert>
            <TextField
              label="Fecha del acta"
              type="date"
              value={fechaRecepcion}
              onChange={(event) => setFechaRecepcion(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              multiline
              minRows={2}
            />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ítem</TableCell>
                    <TableCell align="right">Pendiente</TableCell>
                    <TableCell sx={{ width: 170 }}>Recibir ahora</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compra.detalles.map((detalle) => {
                    const restante = pendiente(detalle);
                    return (
                      <TableRow key={detalle.id}>
                        <TableCell>
                          {descripcionDetalle(detalle)}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            {detalle.tipo === "INVENTARIABLE"
                              ? "Bien inventariable"
                              : "Consumible"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatoNumero(restante)}
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={cantidades[detalle.id] ?? ""}
                            onChange={(event) =>
                              setCantidades((actuales) => ({
                                ...actuales,
                                [detalle.id]: event.target.value,
                              }))
                            }
                            disabled={restante <= 0}
                            slotProps={{
                              htmlInput: {
                                min: 0,
                                max: restante,
                                step:
                                  detalle.tipo === "INVENTARIABLE"
                                    ? 1
                                    : "0.001",
                              },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRecepcionAbierta(false)}
            disabled={recibir.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => recibir.mutate()}
            disabled={recibir.isPending}
            startIcon={
              recibir.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
          >
            {recibir.isPending ? "Registrando..." : "Confirmar recepción"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
