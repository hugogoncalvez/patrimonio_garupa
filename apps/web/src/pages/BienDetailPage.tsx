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
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import RestoreIcon from "@mui/icons-material/Restore";
import { QRCodeSVG } from "qrcode.react";
import { DocumentosBien } from "../components/DocumentosBien";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError } from "../lib/errors";
import {
  formatoFecha,
  formatoFechaHora,
  formatoMoneda,
  hoyISO,
} from "../lib/format";
import type { Bien } from "../types";

const tiposIncorporacion: Record<string, string> = {
  COMPRA: "Compra",
  DONACION: "Donación",
  TRANSFERENCIA: "Transferencia",
  PRESTAMO: "Préstamo",
  OTRO: "Otro",
};

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

export function BienDetailPage() {
  const documentosHabilitados = !import.meta.env.PROD;
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [bajaAbierta, setBajaAbierta] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [destinoBaja, setDestinoBaja] = useState("");
  const [fechaBaja, setFechaBaja] = useState(hoyISO());

  const { data: bien, isLoading, error, refetch } = useQuery<Bien>({
    queryKey: ["bien", id],
    queryFn: async () => (await api.get(`/bienes/${id}`)).data,
    enabled: Boolean(id),
  });

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["bien", id] });
    await queryClient.invalidateQueries({ queryKey: ["bienes"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const darDeBaja = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/bienes/${id}/baja`, {
          motivoBaja: motivoBaja.trim() || null,
          destinoBaja: destinoBaja.trim() || null,
          fechaBaja: new Date(`${fechaBaja}T12:00:00`).toISOString(),
        })
      ).data,
    onSuccess: async () => {
      setBajaAbierta(false);
      await refrescar();
      const Swal = (await import("sweetalert2")).default;
      await Swal.fire({
        icon: "success",
        title: "Bien dado de baja",
        confirmButtonColor: "#0f4c3a",
        timer: 1400,
        showConfirmButton: false,
      });
    },
    onError: alertaError,
  });

  const reactivar = useMutation({
    mutationFn: async () => (await api.patch(`/bienes/${id}/reactivar`)).data,
    onSuccess: async () => {
      await refrescar();
      const Swal = (await import("sweetalert2")).default;
      await Swal.fire({
        icon: "success",
        title: "Bien reactivado",
        confirmButtonColor: "#0f4c3a",
        timer: 1400,
        showConfirmButton: false,
      });
    },
    onError: alertaError,
  });

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
        titulo="No se pudo cargar el bien"
      />
    );
  }

  if (!bien) {
    return <Alert severity="error">No se encontró el bien.</Alert>;
  }

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/bienes")}>
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
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="h4">{bien.codigoInventario}</Typography>
            <Chip
              size="small"
              label={bien.activo ? "Activo" : "Dado de baja"}
              color={bien.activo ? "success" : "default"}
            />
          </Stack>
          <Typography color="text.secondary">{bien.descripcion}</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/bienes/${bien.id}/editar`)}
          >
            Editar
          </Button>
          {bien.activo ? (
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setBajaAbierta(true)}
            >
              Dar de baja
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<RestoreIcon />}
              onClick={() => reactivar.mutate()}
              disabled={reactivar.isPending}
            >
              Reactivar
            </Button>
          )}
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Datos del bien
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" },
                  gap: 2,
                }}
              >
                <Dato label="N° identificación" value={bien.numeroIdentificacion} />
                <Dato label="Rubro" value={bien.rubro?.nombre} />
                <Dato label="Estado" value={bien.estado?.nombre} />
                <Dato label="Marca" value={bien.marca} />
                <Dato label="Modelo" value={bien.modelo} />
                <Dato label="N° de serie" value={bien.numeroSerie} />
                <Dato label="N° de motor" value={bien.numeroMotor} />
                <Dato label="Patente" value={bien.patente} />
                <Dato label="Material" value={bien.material} />
                <Dato label="Medidas" value={bien.medidas} />
                <Dato label="Color" value={bien.color} />
                <Dato
                  label="Tipo de incorporación"
                  value={tiposIncorporacion[bien.tipoIncorporacion] ?? bien.tipoIncorporacion}
                />
                <Dato label="Fecha de alta" value={formatoFecha(bien.fechaAlta)} />
                <Dato label="Valor histórico" value={formatoMoneda(bien.valorHistorico)} />
                <Dato label="Área" value={bien.area?.nombre} />
                <Dato
                  label="Subresponsable"
                  value={
                    bien.subresponsable
                      ? `${bien.subresponsable.apellido}, ${bien.subresponsable.nombre}`
                      : null
                  }
                />
              </Box>
              {bien.observaciones && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">
                    Observaciones
                  </Typography>
                  <Typography variant="body2">{bien.observaciones}</Typography>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Historial
              </Typography>
              <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
                <Tab label="Ubicaciones" />
                <Tab label="Custodia" />
                <Tab label="Compras" />
                {documentosHabilitados ? <Tab label="Documentos" /> : null}
              </Tabs>
              <Divider sx={{ mb: 1 }} />

              {tab === 0 && (
                <List dense>
                  {bien.movimientosUbicacion?.length ? (
                    bien.movimientosUbicacion.map((movimiento) => (
                      <ListItem key={movimiento.id} disableGutters>
                        <ListItemText
                          primary={`${movimiento.tipo} · ${movimiento.areaOrigen?.nombre ?? "Sin área"} → ${movimiento.areaDestino?.nombre ?? "Sin área"}`}
                          secondary={`${formatoFechaHora(movimiento.fecha)}${movimiento.usuario ? ` · ${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : ""}`}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin movimientos de ubicación.
                    </Typography>
                  )}
                </List>
              )}

              {tab === 1 && (
                <List dense>
                  {bien.movimientosCustodia?.length ? (
                    bien.movimientosCustodia.map((movimiento) => (
                      <ListItem key={movimiento.id} disableGutters>
                        <ListItemText
                          primary={`${movimiento.tipo} · ${movimiento.personaOrigen ? `${movimiento.personaOrigen.apellido}, ${movimiento.personaOrigen.nombre}` : "Sin responsable"} → ${movimiento.personaDestino ? `${movimiento.personaDestino.apellido}, ${movimiento.personaDestino.nombre}` : "Sin responsable"}`}
                          secondary={`${formatoFechaHora(movimiento.fecha)}${movimiento.usuario ? ` · ${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : ""}`}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin movimientos de custodia.
                    </Typography>
                  )}
                </List>
              )}

              {tab === 2 && (
                <List dense>
                  {bien.compraDetalle ? (
                    <ListItem disableGutters>
                      <ListItemText
                        primary={`Compra #${bien.compraDetalle.compra?.id} · ${bien.compraDetalle.compra?.proveedor ?? "Sin proveedor"}`}
                        secondary={`${formatoFecha(bien.compraDetalle.compra?.fecha)} · ${formatoMoneda(bien.compraDetalle.precioUnitario)}${bien.actaRecepcion ? ` · Acta ${bien.actaRecepcion.numero}` : ""}`}
                      />
                    </ListItem>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin compras asociadas.
                    </Typography>
                  )}
                </List>
              )}

              {documentosHabilitados && tab === 3 && (
                <DocumentosBien
                  bienId={bien.id}
                  documentos={bien.documentos ?? []}
                  onChanged={refrescar}
                />
              )}
            </CardContent>
          </Card>
        </Stack>

        <Stack spacing={2}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" gutterBottom>
                Etiqueta QR
              </Typography>
              <Box
                sx={{
                  display: "inline-flex",
                  p: 2,
                  bgcolor: "white",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <QRCodeSVG value={bien.codigoInventario} size={150} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 1.5 }}>
                {bien.codigoInventario}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {bien.descripcion}
              </Typography>
            </CardContent>
          </Card>

          {!bien.activo && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Datos de baja
                </Typography>
                <Stack spacing={1}>
                  <Dato label="Fecha" value={formatoFecha(bien.fechaBaja)} />
                  <Dato label="Motivo" value={bien.motivoBaja} />
                  <Dato label="Destino" value={bien.destinoBaja} />
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Box>

      <Dialog open={bajaAbierta} onClose={() => setBajaAbierta(false)} fullWidth maxWidth="sm">
        <DialogTitle>Dar de baja el bien</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              El bien dejará de figurar como activo, pero su historial se conserva.
            </Alert>
            <TextField
              label="Fecha de baja"
              type="date"
              value={fechaBaja}
              onChange={(event) => setFechaBaja(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Motivo"
              value={motivoBaja}
              onChange={(event) => setMotivoBaja(event.target.value)}
              multiline
              minRows={2}
            />
            <TextField
              label="Destino"
              value={destinoBaja}
              onChange={(event) => setDestinoBaja(event.target.value)}
              helperText="Ej.: depósito, transferencia, destrucción, venta"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBajaAbierta(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => darDeBaja.mutate()}
            disabled={darDeBaja.isPending}
          >
            Confirmar baja
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
