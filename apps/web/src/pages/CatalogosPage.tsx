import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError, alertaExito, confirmar } from "../lib/errors";
import { FAMILIAS_BIEN, etiquetaFamilia } from "../lib/bienes";
import type {
  Area,
  CategoriaConsumible,
  EstadoBien,
  FamiliaBien,
  Persona,
  Rubro,
} from "../types";

function BotonNuevo({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="contained" startIcon={<AddIcon />} onClick={onClick}>
      {label}
    </Button>
  );
}

function EstadoChip({ activo }: { activo: boolean }) {
  return (
    <Chip
      size="small"
      label={activo ? "Activo" : "Inactivo"}
      color={activo ? "success" : "default"}
    />
  );
}

function RubrosTab() {
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<Rubro | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    codigoInterno: "",
    codigoCuenta: "",
    codigoCategoria: "",
    familia: "OTRO" as FamiliaBien,
    activo: true,
  });

  const { data, isLoading, error, refetch } = useQuery<Rubro[]>({
    queryKey: ["rubros"],
    queryFn: async () => (await api.get("/catalogos/rubros")).data,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        codigoInterno: form.codigoInterno.trim() || null,
        codigoCuenta: form.codigoCuenta.trim() || null,
        codigoCategoria: form.codigoCategoria
          ? Number(form.codigoCategoria)
          : null,
        familia: form.familia,
        activo: form.activo,
      };
      return editando
        ? (await api.patch(`/catalogos/rubros/${editando.id}`, payload)).data
        : (await api.post("/catalogos/rubros", payload)).data;
    },
    onSuccess: async () => {
      const mensaje = editando ? "Rubro actualizado" : "Rubro creado";
      setDialogo(false);
      await queryClient.invalidateQueries({ queryKey: ["rubros"] });
      await alertaExito(mensaje, form.nombre.trim());
    },
    onError: alertaError,
  });

  const desactivar = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/catalogos/rubros/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rubros"] });
      await alertaExito("Rubro desactivado");
    },
    onError: alertaError,
  });

  const abrirNuevo = () => {
    setEditando(null);
    setForm({
      nombre: "",
      codigoInterno: "",
      codigoCuenta: "",
      codigoCategoria: "",
      familia: "OTRO",
      activo: true,
    });
    setDialogo(true);
  };

  const abrirEditar = (rubro: Rubro) => {
    setEditando(rubro);
    setForm({
      nombre: rubro.nombre,
      codigoInterno: rubro.codigoInterno ?? "",
      codigoCuenta: rubro.codigoCuenta ?? "",
      codigoCategoria: rubro.codigoCategoria
        ? String(rubro.codigoCategoria)
        : "",
      familia: rubro.familia,
      activo: rubro.activo,
    });
    setDialogo(true);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <BotonNuevo onClick={abrirNuevo} label="Nuevo rubro" />
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Familia</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Código interno</TableCell>
              <TableCell>Código contable</TableCell>
              <TableCell align="right">Bienes</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            )}

            {error && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 2 }}>
                  <ErrorCarga
                    error={error}
                    onRetry={() => void refetch()}
                    titulo="No se pudieron cargar los rubros"
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.map((rubro) => (
              <TableRow key={rubro.id} hover>
                <TableCell>{rubro.nombre}</TableCell>
                <TableCell>{etiquetaFamilia(rubro.familia)}</TableCell>
                <TableCell>{rubro.codigoCategoria ?? "-"}</TableCell>
                <TableCell>{rubro.codigoInterno ?? "-"}</TableCell>
                <TableCell>{rubro.codigoCuenta ?? "-"}</TableCell>
                <TableCell align="right">{rubro._count?.bienes ?? 0}</TableCell>
                <TableCell>
                  <EstadoChip activo={rubro.activo} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => abrirEditar(rubro)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (
                        await confirmar(
                          "Desactivar rubro",
                          `¿Desactivar "${rubro.nombre}"? Los bienes existentes no se modifican.`,
                        )
                      ) {
                        desactivar.mutate(rubro.id);
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
      </TableContainer>

      <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editando ? "Editar rubro" : "Nuevo rubro"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              required
            />
            <TextField
              select
              label="Familia"
              value={form.familia}
              onChange={(event) =>
                setForm({
                  ...form,
                  familia: event.target.value as FamiliaBien,
                })
              }
              helperText="Define qué campos se muestran en el alta del bien."
              required
            >
              {FAMILIAS_BIEN.map((familia) => (
                <MenuItem key={familia.value} value={familia.value}>
                  {familia.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Categoría"
              type="number"
              value={form.codigoCategoria}
              onChange={(event) =>
                setForm({ ...form, codigoCategoria: event.target.value })
              }
              helperText="Número de 1 a 7. Se usa en el código del bien."
              slotProps={{ htmlInput: { min: 1, max: 7 } }}
            />
            <TextField
              label="Código interno"
              value={form.codigoInterno}
              onChange={(event) =>
                setForm({ ...form, codigoInterno: event.target.value })
              }
            />
            <TextField
              label="Código contable"
              value={form.codigoCuenta}
              onChange={(event) =>
                setForm({ ...form, codigoCuenta: event.target.value })
              }
              helperText="Reservado para la Etapa 2"
            />
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
    </Stack>
  );
}

function EstadosTab() {
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<EstadoBien | null>(null);
  const [form, setForm] = useState({ nombre: "", activo: true });

  const { data, isLoading, error, refetch } = useQuery<EstadoBien[]>({
    queryKey: ["estados"],
    queryFn: async () => (await api.get("/catalogos/estados")).data,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = { nombre: form.nombre.trim(), activo: form.activo };
      return editando
        ? (await api.patch(`/catalogos/estados/${editando.id}`, payload)).data
        : (await api.post("/catalogos/estados", payload)).data;
    },
    onSuccess: async () => {
      const mensaje = editando ? "Estado actualizado" : "Estado creado";
      setDialogo(false);
      await queryClient.invalidateQueries({ queryKey: ["estados"] });
      await alertaExito(mensaje, form.nombre.trim());
    },
    onError: alertaError,
  });

  const desactivar = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/catalogos/estados/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["estados"] });
      await alertaExito("Estado desactivado");
    },
    onError: alertaError,
  });

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <BotonNuevo
          onClick={() => {
            setEditando(null);
            setForm({ nombre: "", activo: true });
            setDialogo(true);
          }}
          label="Nuevo estado"
        />
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell align="right">Bienes</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            )}

            {error && (
              <TableRow>
                <TableCell colSpan={4} sx={{ py: 2 }}>
                  <ErrorCarga
                    error={error}
                    onRetry={() => void refetch()}
                    titulo="No se pudieron cargar los estados"
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.map((estado) => (
              <TableRow key={estado.id} hover>
                <TableCell>{estado.nombre}</TableCell>
                <TableCell align="right">{estado._count?.bienes ?? 0}</TableCell>
                <TableCell>
                  <EstadoChip activo={estado.activo} />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditando(estado);
                      setForm({ nombre: estado.nombre, activo: estado.activo });
                      setDialogo(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (
                        await confirmar(
                          "Desactivar estado",
                          `¿Desactivar "${estado.nombre}"?`,
                        )
                      ) {
                        desactivar.mutate(estado.id);
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
      </TableContainer>

      <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editando ? "Editar estado" : "Nuevo estado"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              required
            />
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
    </Stack>
  );
}


function CategoriasConsumiblesTab() {
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<CategoriaConsumible | null>(null);
  const [form, setForm] = useState({ nombre: "", activo: true });

  const { data, isLoading, error, refetch } = useQuery<CategoriaConsumible[]>({
    queryKey: ["categorias-consumibles"],
    queryFn: async () =>
      (await api.get("/catalogos/categorias-consumibles")).data,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = { nombre: form.nombre.trim(), activo: form.activo };
      return editando
        ? (
            await api.patch(
              `/catalogos/categorias-consumibles/${editando.id}`,
              payload,
            )
          ).data
        : (await api.post("/catalogos/categorias-consumibles", payload)).data;
    },
    onSuccess: async () => {
      setDialogo(false);
      await queryClient.invalidateQueries({
        queryKey: ["categorias-consumibles"],
      });
      await queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      await alertaExito(
        editando ? "Categoría actualizada" : "Categoría creada",
        form.nombre.trim(),
      );
    },
    onError: alertaError,
  });

  const desactivar = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/catalogos/categorias-consumibles/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["categorias-consumibles"],
      });
      await queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      await alertaExito("Categoría desactivada");
    },
    onError: alertaError,
  });

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <BotonNuevo
          onClick={() => {
            setEditando(null);
            setForm({ nombre: "", activo: true });
            setDialogo(true);
          }}
          label="Nueva categoría"
        />
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell align="right">Consumibles</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            )}

            {error && (
              <TableRow>
                <TableCell colSpan={4} sx={{ py: 2 }}>
                  <ErrorCarga
                    error={error}
                    onRetry={() => void refetch()}
                    titulo="No se pudieron cargar las categorías"
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.map((categoria) => (
              <TableRow key={categoria.id} hover>
                <TableCell>{categoria.nombre}</TableCell>
                <TableCell align="right">
                  {categoria._count?.consumibles ?? 0}
                </TableCell>
                <TableCell>
                  <EstadoChip activo={categoria.activo} />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditando(categoria);
                      setForm({
                        nombre: categoria.nombre,
                        activo: categoria.activo,
                      });
                      setDialogo(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (
                        await confirmar(
                          "Desactivar categoría",
                          `¿Desactivar "${categoria.nombre}"? Los consumibles existentes conservan la categoría.`,
                        )
                      ) {
                        desactivar.mutate(categoria.id);
                      }
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Todavía no hay categorías configuradas.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogo}
        onClose={() => setDialogo(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {editando ? "Editar categoría" : "Nueva categoría"}
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
            <FormControlLabel
              control={
                <Switch
                  checked={form.activo}
                  onChange={(event) =>
                    setForm({ ...form, activo: event.target.checked })
                  }
                />
              }
              label="Activa"
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
    </Stack>
  );
}

function AreasTab() {
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<Area | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    direccion: "",
    responsableId: "",
    activo: true,
  });

  const { data, isLoading, error, refetch } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/catalogos/areas")).data,
  });

  const { data: personas } = useQuery<Persona[]>({
    queryKey: ["personas"],
    queryFn: async () => (await api.get("/catalogos/personas")).data,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim() || null,
        responsableId: form.responsableId ? Number(form.responsableId) : null,
        activo: form.activo,
      };
      return editando
        ? (await api.patch(`/catalogos/areas/${editando.id}`, payload)).data
        : (await api.post("/catalogos/areas", payload)).data;
    },
    onSuccess: async () => {
      const mensaje = editando ? "Área actualizada" : "Área creada";
      setDialogo(false);
      await queryClient.invalidateQueries({ queryKey: ["areas"] });
      await alertaExito(mensaje, form.nombre.trim());
    },
    onError: alertaError,
  });

  const desactivar = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/catalogos/areas/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["areas"] });
      await alertaExito("Área desactivada");
    },
    onError: alertaError,
  });

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: "", direccion: "", responsableId: "", activo: true });
    setDialogo(true);
  };

  const abrirEditar = (area: Area) => {
    setEditando(area);
    setForm({
      nombre: area.nombre,
      direccion: area.direccion ?? "",
      responsableId: area.responsableId ? String(area.responsableId) : "",
      activo: area.activo,
    });
    setDialogo(true);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <BotonNuevo onClick={abrirNuevo} label="Nueva área" />
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Domicilio</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell align="right">Bienes</TableCell>
              <TableCell align="right">Personas</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            )}

            {error && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 2 }}>
                  <ErrorCarga
                    error={error}
                    onRetry={() => void refetch()}
                    titulo="No se pudieron cargar las áreas"
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.map((area) => (
              <TableRow key={area.id} hover>
                <TableCell>{area.nombre}</TableCell>
                <TableCell>{area.direccion ?? "-"}</TableCell>
                <TableCell>
                  {area.responsable
                    ? `${area.responsable.apellido}, ${area.responsable.nombre}`
                    : "-"}
                </TableCell>
                <TableCell align="right">{area._count?.bienes ?? 0}</TableCell>
                <TableCell align="right">{area._count?.personas ?? 0}</TableCell>
                <TableCell>
                  <EstadoChip activo={area.activo} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => abrirEditar(area)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (
                        await confirmar(
                          "Desactivar área",
                          `¿Desactivar "${area.nombre}"?`,
                        )
                      ) {
                        desactivar.mutate(area.id);
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
      </TableContainer>

      <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editando ? "Editar área" : "Nueva área"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              required
            />
            <TextField
              label="Domicilio"
              value={form.direccion}
              onChange={(event) =>
                setForm({ ...form, direccion: event.target.value })
              }
              helperText="Calle, número y localidad (opcional)"
            />
            <TextField
              select
              label="Responsable"
              value={form.responsableId}
              onChange={(event) =>
                setForm({ ...form, responsableId: event.target.value })
              }
              helperText="Opcional. Persona a cargo del área; se puede asignar después."
            >
              <MenuItem value="">Sin responsable</MenuItem>
              {personas?.map((persona) => (
                <MenuItem key={persona.id} value={String(persona.id)}>
                  {persona.apellido}, {persona.nombre}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={form.activo}
                  onChange={(event) =>
                    setForm({ ...form, activo: event.target.checked })
                  }
                />
              }
              label="Activa"
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
    </Stack>
  );
}

function PersonasTab() {
  const queryClient = useQueryClient();
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<Persona | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    cargo: "",
    areaId: "",
    activo: true,
  });

  const { data, isLoading, error, refetch } = useQuery<Persona[]>({
    queryKey: ["personas"],
    queryFn: async () => (await api.get("/catalogos/personas")).data,
  });

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/catalogos/areas")).data,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.trim() || null,
        cargo: form.cargo.trim() || null,
        areaId: form.areaId ? Number(form.areaId) : null,
        activo: form.activo,
      };
      return editando
        ? (await api.patch(`/catalogos/personas/${editando.id}`, payload)).data
        : (await api.post("/catalogos/personas", payload)).data;
    },
    onSuccess: async () => {
      const mensaje = editando ? "Persona actualizada" : "Persona creada";
      setDialogo(false);
      await queryClient.invalidateQueries({ queryKey: ["personas"] });
      await alertaExito(
        mensaje,
        `${form.apellido.trim()}, ${form.nombre.trim()}`,
      );
    },
    onError: alertaError,
  });

  const desactivar = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/catalogos/personas/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["personas"] });
      await alertaExito("Persona desactivada");
    },
    onError: alertaError,
  });

  const abrirNuevo = () => {
    setEditando(null);
    setForm({
      nombre: "",
      apellido: "",
      dni: "",
      cargo: "",
      areaId: "",
      activo: true,
    });
    setDialogo(true);
  };

  const abrirEditar = (persona: Persona) => {
    setEditando(persona);
    setForm({
      nombre: persona.nombre,
      apellido: persona.apellido,
      dni: persona.dni ?? "",
      cargo: persona.cargo ?? "",
      areaId: persona.areaId ? String(persona.areaId) : "",
      activo: persona.activo,
    });
    setDialogo(true);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
        <BotonNuevo onClick={abrirNuevo} label="Nueva persona" />
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Apellido y nombre</TableCell>
              <TableCell>DNI</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Área</TableCell>
              <TableCell align="right">Bienes</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            )}

            {error && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 2 }}>
                  <ErrorCarga
                    error={error}
                    onRetry={() => void refetch()}
                    titulo="No se pudieron cargar las personas"
                  />
                </TableCell>
              </TableRow>
            )}
            {data?.map((persona) => (
              <TableRow key={persona.id} hover>
                <TableCell>
                  {persona.apellido}, {persona.nombre}
                </TableCell>
                <TableCell>{persona.dni ?? "-"}</TableCell>
                <TableCell>{persona.cargo ?? "-"}</TableCell>
                <TableCell>{persona.area?.nombre ?? "-"}</TableCell>
                <TableCell align="right">{persona._count?.bienes ?? 0}</TableCell>
                <TableCell>
                  <EstadoChip activo={persona.activo} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => abrirEditar(persona)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={async () => {
                      if (
                        await confirmar(
                          "Desactivar persona",
                          `¿Desactivar a ${persona.apellido}, ${persona.nombre}?`,
                        )
                      ) {
                        desactivar.mutate(persona.id);
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
      </TableContainer>

      <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editando ? "Editar persona" : "Nueva persona"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={(event) =>
                  setForm({ ...form, nombre: event.target.value })
                }
                required
                fullWidth
              />
              <TextField
                label="Apellido"
                value={form.apellido}
                onChange={(event) =>
                  setForm({ ...form, apellido: event.target.value })
                }
                required
                fullWidth
              />
            </Stack>
            <TextField
              label="DNI"
              value={form.dni}
              onChange={(event) => setForm({ ...form, dni: event.target.value })}
            />
            <TextField
              label="Cargo"
              value={form.cargo}
              onChange={(event) => setForm({ ...form, cargo: event.target.value })}
            />
            <TextField
              select
              label="Área"
              value={form.areaId}
              onChange={(event) =>
                setForm({ ...form, areaId: event.target.value })
              }
              helperText="Opcional. Área donde se desempeña; se puede asignar después."
            >
              <MenuItem value="">Sin área</MenuItem>
              {areas?.map((area) => (
                <MenuItem key={area.id} value={String(area.id)}>
                  {area.nombre}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={form.activo}
                  onChange={(event) =>
                    setForm({ ...form, activo: event.target.checked })
                  }
                />
              }
              label="Activa"
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
            disabled={
              guardar.isPending || !form.nombre.trim() || !form.apellido.trim()
            }
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
    </Stack>
  );
}

export function CatalogosPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const volverAConsumibles = searchParams.get("volver") === "consumibles";
  const [tab, setTab] = useState(() => {
    const valor = Number(searchParams.get("tab"));
    return Number.isInteger(valor) && valor >= 0 && valor <= 4 ? valor : 0;
  });

  return (
    <Stack spacing={2.5}>
      {volverAConsumibles && (
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/consumibles")}
          >
            Volver
          </Button>
        </Box>
      )}

      <Box>
        <Typography variant="h4">Configuración</Typography>
        <Typography color="text.secondary">
          Rubros, estados, categorías de consumibles, áreas y personas
          responsables.
        </Typography>
      </Box>

      <Card>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Tab label="Rubros" />
          <Tab label="Estados" />
          <Tab label="Categorías de consumibles" />
          <Tab label="Áreas" />
          <Tab label="Personas" />
        </Tabs>
        <CardContent>
          {tab === 0 && <RubrosTab />}
          {tab === 1 && <EstadosTab />}
          {tab === 2 && <CategoriasConsumiblesTab />}
          {tab === 3 && <AreasTab />}
          {tab === 4 && <PersonasTab />}
        </CardContent>
      </Card>
    </Stack>
  );
}
