import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Switch,
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
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError, alertaExito } from "../lib/errors";
import { formatoNumero } from "../lib/format";
import type { CategoriaConsumible, Consumible, Paginado } from "../types";

interface FormConsumible {
  nombre: string;
  categoriaId: string;
  unidadMedida: string;
  stockActual: string;
  stockMinimo: string;
  activo: boolean;
}

const formInicial: FormConsumible = {
  nombre: "",
  categoriaId: "",
  unidadMedida: "unidad",
  stockActual: "0",
  stockMinimo: "0",
  activo: true,
};

export function ConsumiblesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [stockBajo, setStockBajo] = useState("");
  const [activo, setActivo] = useState("");
  const [page, setPage] = useState(0);

  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<Consumible | null>(null);
  const [form, setForm] = useState<FormConsumible>(formInicial);

  const [movimientoAbierto, setMovimientoAbierto] = useState(false);
  const [consumibleMov, setConsumibleMov] = useState<Consumible | null>(null);
  const [tipoMov, setTipoMov] = useState("INGRESO");
  const [cantidad, setCantidad] = useState("1");
  const [observaciones, setObservaciones] = useState("");

  const { data: categorias } = useQuery<CategoriaConsumible[]>({
    queryKey: ["categorias-consumibles"],
    queryFn: async () =>
      (await api.get("/catalogos/categorias-consumibles")).data,
  });

  const { data, isLoading, error, refetch } = useQuery<Paginado<Consumible>>({
    queryKey: ["consumibles", q, stockBajo, activo, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: 20,
      };
      if (q.trim()) params.q = q.trim();
      if (stockBajo) params.stockBajo = stockBajo;
      if (activo) params.activo = activo;
      return (await api.get("/consumibles", { params })).data;
    },
  });

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["consumibles"] });
    await queryClient.invalidateQueries({ queryKey: ["categorias-consumibles"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
        unidadMedida: form.unidadMedida.trim() || "unidad",
        stockMinimo: Number(form.stockMinimo || 0),
        activo: form.activo,
        ...(editando ? {} : { stockActual: Number(form.stockActual || 0) }),
      };

      if (editando) {
        return (await api.patch(`/consumibles/${editando.id}`, payload)).data;
      }

      return (await api.post("/consumibles", payload)).data;
    },
    onSuccess: async () => {
      const mensaje = editando
        ? "Consumible actualizado"
        : "Consumible creado";
      setDialogo(false);
      await refrescar();
      await alertaExito(mensaje, form.nombre.trim());
    },
    onError: alertaError,
  });

  const mover = useMutation({
    mutationFn: async () => {
      if (!consumibleMov) throw new Error("Consumible no seleccionado");
      return (
        await api.post(`/consumibles/${consumibleMov.id}/movimientos`, {
          tipo: tipoMov,
          cantidad: Number(cantidad),
          observaciones: observaciones.trim() || null,
        })
      ).data;
    },
    onSuccess: async () => {
      setMovimientoAbierto(false);
      await refrescar();
      await alertaExito(
        "Movimiento registrado",
        `${tipoMov === "INGRESO" ? "Ingreso" : "Ajuste"} de ${cantidad} ${consumibleMov?.unidadMedida ?? "unidad"}`,
      );
    },
    onError: alertaError,
  });

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formInicial);
    setDialogo(true);
  };

  const abrirEditar = (consumible: Consumible) => {
    setEditando(consumible);
    setForm({
      nombre: consumible.nombre,
      categoriaId: consumible.categoria ? String(consumible.categoria.id) : "",
      unidadMedida: consumible.unidadMedida,
      stockActual: String(consumible.stockActual),
      stockMinimo: String(consumible.stockMinimo),
      activo: consumible.activo,
    });
    setDialogo(true);
  };

  const abrirMovimiento = (consumible: Consumible) => {
    setConsumibleMov(consumible);
    setTipoMov("INGRESO");
    setCantidad("1");
    setObservaciones("");
    setMovimientoAbierto(true);
  };

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
          <Typography variant="h4">Consumibles</Typography>
          <Typography color="text.secondary">
            Listado, stock mínimo y movimientos. Las entregas se registran con
            acta.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={() =>
              navigate("/configuracion?tab=2&volver=consumibles")
            }
          >
            Categorías
          </Button>
          <Button variant="outlined" onClick={() => navigate("/entregas")}>
            Ver entregas
          </Button>
          <Button
            variant="contained"
            startIcon={<ReceiptLongIcon />}
            onClick={() => navigate("/entregas/nueva")}
          >
            Nueva entrega
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={abrirNuevo}>
            Nuevo consumible
          </Button>
        </Stack>
      </Box>

      <Card sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 180px 180px" },
            gap: 2,
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar consumible..."
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
            value={stockBajo}
            onChange={(event) => {
              setStockBajo(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todo el stock</MenuItem>
            <MenuItem value="true">Solo stock bajo</MenuItem>
          </Select>
          <Select
            size="small"
            displayEmpty
            value={activo}
            onChange={(event) => {
              setActivo(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="true">Activos</MenuItem>
            <MenuItem value="false">Inactivos</MenuItem>
          </Select>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Mínimo</TableCell>
                <TableCell>Unidad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}

              {error && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 2 }}>
                    <ErrorCarga
                      error={error}
                      onRetry={() => void refetch()}
                      titulo="No se pudo cargar el listado de consumibles"
                    />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !error && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No hay consumibles cargados.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {data?.items.map((consumible) => {
                const bajo =
                  Number(consumible.stockActual) <= Number(consumible.stockMinimo);
                return (
                  <TableRow key={consumible.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {consumible.nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {consumible.categoria?.nombre ?? "-"}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={formatoNumero(consumible.stockActual)}
                        color={bajo ? "warning" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatoNumero(consumible.stockMinimo)}
                    </TableCell>
                    <TableCell>{consumible.unidadMedida}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={consumible.activo ? "Activo" : "Inactivo"}
                        color={consumible.activo ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="Registrar movimiento"
                        onClick={() => abrirMovimiento(consumible)}
                      >
                        <SwapVertIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Editar"
                        onClick={() => abrirEditar(consumible)}
                      >
                        <EditIcon fontSize="small" />
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
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Card>

      <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editando ? "Editar consumible" : "Nuevo consumible"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={(event) =>
                setForm({ ...form, nombre: event.target.value })
              }
              required
            />
            <TextField
              select
              label="Categoría"
              value={form.categoriaId}
              onChange={(event) =>
                setForm({ ...form, categoriaId: event.target.value })
              }
              helperText="Se administran en Configuración → Categorías de consumibles."
            >
              <MenuItem value="">Sin categoría</MenuItem>
              {(categorias ?? [])
                .filter(
                  (categoria) =>
                    categoria.activo ||
                    String(categoria.id) === form.categoriaId,
                )
                .map((categoria) => (
                  <MenuItem key={categoria.id} value={String(categoria.id)}>
                    {categoria.nombre}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label="Unidad de medida"
              value={form.unidadMedida}
              onChange={(event) =>
                setForm({ ...form, unidadMedida: event.target.value })
              }
              helperText="Ej.: unidad, caja, resma, litro"
            />
            <Stack direction="row" spacing={2}>
              {!editando && (
                <TextField
                  label="Stock inicial"
                  type="number"
                  value={form.stockActual}
                  onChange={(event) =>
                    setForm({ ...form, stockActual: event.target.value })
                  }
                  slotProps={{ htmlInput: { min: 0, step: "0.001" } }}
                  fullWidth
                />
              )}
              <TextField
                label="Stock mínimo"
                type="number"
                value={form.stockMinimo}
                onChange={(event) =>
                  setForm({ ...form, stockMinimo: event.target.value })
                }
                slotProps={{ htmlInput: { min: 0, step: "0.001" } }}
                fullWidth
              />
            </Stack>
            {editando && (
              <Typography variant="caption" color="text.secondary">
                El stock se modifica únicamente registrando movimientos.
              </Typography>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={form.activo}
                  onChange={(event) =>
                    setForm({ ...form, activo: event.target.checked })
                  }
                />
              }
              label="Activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialogo(false)}
            disabled={guardar.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending || !form.nombre.trim()}
            startIcon={
              guardar.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
          >
            {guardar.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={movimientoAbierto}
        onClose={() => setMovimientoAbierto(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Movimiento de stock · {consumibleMov?.nombre}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Stock actual: {formatoNumero(consumibleMov?.stockActual)}{" "}
              {consumibleMov?.unidadMedida}
            </Typography>
            <TextField
              select
              label="Tipo"
              value={tipoMov}
              onChange={(event) => setTipoMov(event.target.value)}
            >
              <MenuItem value="INGRESO">Ingreso</MenuItem>
              <MenuItem value="AJUSTE">Ajuste</MenuItem>
            </TextField>
            <TextField
              label="Cantidad"
              type="number"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              helperText={
                tipoMov === "AJUSTE"
                  ? "Usá negativo para descontar stock"
                  : "La cantidad debe ser mayor a cero"
              }
              slotProps={{ htmlInput: { step: "0.001" } }}
            />
            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setMovimientoAbierto(false)}
            disabled={mover.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => mover.mutate()}
            disabled={mover.isPending || !cantidad}
            startIcon={
              mover.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : undefined
            }
          >
            {mover.isPending ? "Registrando..." : "Registrar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
