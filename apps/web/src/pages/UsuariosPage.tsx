import { useState } from "react";
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
  MenuItem,
  Stack,
  Switch,
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
import EditIcon from "@mui/icons-material/Edit";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError, alertaExito, confirmar } from "../lib/errors";
import { useAuth } from "../auth/AuthContext";
import type { Rol, Usuario } from "../types";

interface FormUsuario {
  nombre: string;
  apellido: string;
  usuario: string;
  pass: string;
  rol: Rol;
  activo: boolean;
}

const formInicial: FormUsuario = {
  nombre: "",
  apellido: "",
  usuario: "",
  pass: "",
  rol: "PATRIMONIO",
  activo: true,
};

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const { usuario: usuarioActual } = useAuth();
  const [dialogo, setDialogo] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormUsuario>(formInicial);

  const { data, isLoading, error, refetch } = useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: async () => (await api.get("/usuarios")).data,
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        usuario: form.usuario.trim(),
        rol: form.rol,
        activo: form.activo,
        ...(form.pass ? { pass: form.pass } : {}),
      };
      return editando
        ? (await api.patch(`/usuarios/${editando.id}`, payload)).data
        : (await api.post("/usuarios", payload)).data;
    },
    onSuccess: async () => {
      const mensaje = editando ? "Usuario actualizado" : "Usuario creado";
      setDialogo(false);
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      await alertaExito(mensaje, `${form.apellido}, ${form.nombre}`);
    },
    onError: alertaError,
  });

  const desactivar = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/usuarios/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      await alertaExito("Usuario desactivado");
    },
    onError: alertaError,
  });

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formInicial);
    setDialogo(true);
  };

  const abrirEditar = (usuario: Usuario) => {
    setEditando(usuario);
    setForm({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      usuario: usuario.usuario,
      pass: "",
      rol: usuario.rol,
      activo: usuario.activo ?? true,
    });
    setDialogo(true);
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
          <Typography variant="h4">Usuarios</Typography>
          <Typography color="text.secondary">
            Altas, roles y estado de acceso al sistema.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNuevo}>
          Nuevo usuario
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 2 }}>
                    <ErrorCarga
                      error={error}
                      onRetry={() => void refetch()}
                      titulo="No se pudo cargar el listado de usuarios"
                    />
                  </TableCell>
                </TableRow>
              )}
              {data?.map((usuario) => (
                <TableRow key={usuario.id} hover>
                  <TableCell>
                    {usuario.apellido}, {usuario.nombre}
                  </TableCell>
                  <TableCell>@{usuario.usuario}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={usuario.rol === "CONTABLE" ? "Contable" : "Patrimonio"}
                      color={usuario.rol === "CONTABLE" ? "primary" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={usuario.activo ? "Activo" : "Inactivo"}
                      color={usuario.activo ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => abrirEditar(usuario)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={
                        !usuario.activo || usuario.id === usuarioActual?.id
                      }
                      onClick={async () => {
                        if (
                          await confirmar(
                            "Desactivar usuario",
                            `¿Desactivar a ${usuario.apellido}, ${usuario.nombre}?`,
                          )
                        ) {
                          desactivar.mutate(usuario.id);
                        }
                      }}
                    >
                      <PersonOffIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogo} onClose={() => setDialogo(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editando ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
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
              label="Usuario"
              value={form.usuario}
              onChange={(event) =>
                setForm({ ...form, usuario: event.target.value })
              }
              required
            />
            <TextField
              label={editando ? "Nueva contraseña (opcional)" : "Contraseña"}
              type="password"
              value={form.pass}
              onChange={(event) => setForm({ ...form, pass: event.target.value })}
              required={!editando}
              helperText={
                editando
                  ? "Dejá vacío para conservar la contraseña actual"
                  : "Mínimo 6 caracteres"
              }
            />
            <TextField
              select
              label="Rol"
              value={form.rol}
              onChange={(event) =>
                setForm({ ...form, rol: event.target.value as Rol })
              }
            >
              <MenuItem value="CONTABLE">Contable (administrador)</MenuItem>
              <MenuItem value="PATRIMONIO">Patrimonio (operativo)</MenuItem>
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
            disabled={
              guardar.isPending ||
              !form.nombre.trim() ||
              !form.apellido.trim() ||
              !form.usuario.trim() ||
              (!editando && form.pass.length < 6)
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
