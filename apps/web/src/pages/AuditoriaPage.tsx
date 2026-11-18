import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { formatoFechaHora } from "../lib/format";
import type {
  AccionAuditoria,
  AuditoriaDetalle,
  AuditoriaItem,
  AuditoriaListado,
  Usuario,
} from "../types";

const acciones: {
  value: AccionAuditoria;
  label: string;
  color: "success" | "info" | "error" | "default" | "primary" | "warning";
}[] = [
  { value: "CREAR", label: "Crear", color: "success" },
  { value: "ACTUALIZAR", label: "Actualizar", color: "info" },
  { value: "ELIMINAR", label: "Eliminar", color: "error" },
  { value: "LOGIN", label: "Login", color: "default" },
  { value: "IMPRIMIR", label: "Imprimir", color: "primary" },
  { value: "ANULAR", label: "Anular", color: "warning" },
];

const accionPorValor = new Map(acciones.map((accion) => [accion.value, accion]));

function nombreEntidad(entidad: string) {
  return entidad.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | number;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {etiqueta}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {valor}
      </Typography>
    </Box>
  );
}

function BloqueJson({ titulo, valor }: { titulo: string; valor: unknown }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {titulo}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight: 320,
          overflow: "auto",
          bgcolor: "action.hover",
          borderRadius: 1,
          fontFamily: "monospace",
          fontSize: 12,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {JSON.stringify(valor, null, 2)}
      </Box>
    </Box>
  );
}

export function AuditoriaPage() {
  const [q, setQ] = useState("");
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(0);
  const [detalleId, setDetalleId] = useState<number | null>(null);

  const { data: usuarios } = useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: async () => (await api.get("/usuarios")).data,
  });

  const { data, isLoading, error, refetch } = useQuery<AuditoriaListado>({
    queryKey: ["auditoria", q, accion, entidad, usuarioId, desde, hasta, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: 25,
      };

      if (q.trim()) params.q = q.trim();
      if (accion) params.accion = accion;
      if (entidad) params.entidad = entidad;
      if (usuarioId) params.usuarioId = usuarioId;
      if (desde) params.desde = new Date(`${desde}T00:00:00`).toISOString();
      if (hasta) params.hasta = new Date(`${hasta}T23:59:59.999`).toISOString();

      return (await api.get("/auditoria", { params })).data;
    },
  });

  const {
    data: detalle,
    isLoading: cargandoDetalle,
    error: errorDetalle,
    refetch: refetchDetalle,
  } = useQuery<AuditoriaDetalle>({
    queryKey: ["auditoria-detalle", detalleId],
    queryFn: async () => {
      if (detalleId === null) {
        throw new Error("Registro no seleccionado");
      }
      return (await api.get(`/auditoria/${detalleId}`)).data;
    },
    enabled: detalleId !== null,
  });

  const limpiarFiltros = () => {
    setQ("");
    setAccion("");
    setEntidad("");
    setUsuarioId("");
    setDesde("");
    setHasta("");
    setPage(0);
  };

  const hayFiltros = Boolean(q || accion || entidad || usuarioId || desde || hasta);

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          gap: 2,
          alignItems: { sm: "center" },
        }}
      >
        <Box>
          <Typography variant="h4">Auditoría</Typography>
          <Typography color="text.secondary">
            Registro de acciones realizadas por los usuarios del sistema.
          </Typography>
        </Box>
      </Box>

      <Card sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "minmax(240px, 2fr) repeat(3, minmax(160px, 1.2fr))",
            },
            gap: 2,
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar por entidad, usuario o IP..."
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Select
            size="small"
            displayEmpty
            value={accion}
            onChange={(event) => {
              setAccion(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas las acciones</MenuItem>
            {acciones.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            displayEmpty
            value={entidad}
            onChange={(event) => {
              setEntidad(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas las entidades</MenuItem>
            {(data?.entidades ?? []).map((item) => (
              <MenuItem key={item} value={item}>
                {nombreEntidad(item)}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            displayEmpty
            value={usuarioId}
            onChange={(event) => {
              setUsuarioId(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todos los usuarios</MenuItem>
            {(usuarios ?? []).map((usuario) => (
              <MenuItem key={usuario.id} value={String(usuario.id)}>
                {usuario.apellido}, {usuario.nombre}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            type="date"
            label="Desde"
            value={desde}
            onChange={(event) => {
              setDesde(event.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="Hasta"
            value={hasta}
            onChange={(event) => {
              setHasta(event.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={limpiarFiltros}
            disabled={!hayFiltros}
          >
            Limpiar filtros
          </Button>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha y hora</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Entidad</TableCell>
                <TableCell>IP</TableCell>
                <TableCell align="right">Detalle</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}

              {error && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 2 }}>
                    <ErrorCarga
                      error={error}
                      onRetry={() => void refetch()}
                      titulo="No se pudo cargar la auditoría"
                    />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !error && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No hay registros de auditoría para los filtros seleccionados.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {data?.items.map((item: AuditoriaItem) => {
                const accionItem = accionPorValor.get(item.accion);

                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatoFechaHora(item.fecha)}
                    </TableCell>
                    <TableCell>
                      {item.usuario ? (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.usuario.apellido}, {item.usuario.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{item.usuario.usuario}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sistema
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={accionItem?.label ?? item.accion}
                        color={accionItem?.color ?? "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {nombreEntidad(item.entidad)}
                      </Typography>
                      {item.entidadId ? (
                        <Typography variant="caption" color="text.secondary">
                          #{item.entidadId}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{item.ip ?? "-"}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="Ver detalle"
                        onClick={() => setDetalleId(item.id)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_event, nextPage) => setPage(nextPage)}
          rowsPerPage={25}
          rowsPerPageOptions={[25]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Card>

      <Dialog
        open={detalleId !== null}
        onClose={() => setDetalleId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Detalle de auditoría</DialogTitle>
        <DialogContent dividers>
          {cargandoDetalle && (
            <Stack sx={{ py: 6, alignItems: "center" }}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {errorDetalle && (
            <ErrorCarga
              error={errorDetalle}
              onRetry={() => void refetchDetalle()}
              titulo="No se pudo cargar el detalle"
            />
          )}

          {detalle && (
            <Stack spacing={2.5}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", flexWrap: "wrap" }}
              >
                <Chip
                  size="small"
                  label={
                    accionPorValor.get(detalle.accion)?.label ?? detalle.accion
                  }
                  color={accionPorValor.get(detalle.accion)?.color ?? "default"}
                />
                <Typography variant="h6">
                  {nombreEntidad(detalle.entidad)}
                  {detalle.entidadId ? ` #${detalle.entidadId}` : ""}
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                <Dato etiqueta="Fecha y hora" valor={formatoFechaHora(detalle.fecha)} />
                <Dato
                  etiqueta="Usuario"
                  valor={
                    detalle.usuario
                      ? `${detalle.usuario.apellido}, ${detalle.usuario.nombre}`
                      : "Sistema / usuario eliminado"
                  }
                />
                <Dato etiqueta="IP" valor={detalle.ip ?? "-"} />
                <Dato etiqueta="Registro" valor={`#${detalle.id}`} />
              </Box>

              {detalle.datosAnteriores != null && (
                <BloqueJson
                  titulo="Datos anteriores"
                  valor={detalle.datosAnteriores}
                />
              )}

              {detalle.datosNuevos != null && (
                <BloqueJson titulo="Datos nuevos" valor={detalle.datosNuevos} />
              )}

              {detalle.datosAnteriores == null &&
                detalle.datosNuevos == null && (
                  <Typography color="text.secondary">
                    Este registro no tiene datos adicionales.
                  </Typography>
                )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleId(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
