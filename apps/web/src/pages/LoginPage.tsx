import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { mensajeError } from "../lib/errors";

export function LoginPage() {
  const theme = useTheme();
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setEnviando(true);

    try {
      await login(nombreUsuario.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        background:
          theme.palette.mode === "dark"
            ? "radial-gradient(circle at top left, #173126 0%, #0b1210 45%, #101a15 100%)"
            : "radial-gradient(circle at top left, #dcebe4 0%, #f4f6f5 45%, #eef1ef 100%)",
      }}
    >
      <ThemeToggle
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 1,
        }}
      />
      <Card sx={{ width: "100%", maxWidth: 430 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
          <Stack spacing={1} sx={{ alignItems: "center", mb: 3 }}>
            <Box
              component="img"
              src="/escudo-icono.png"
              alt="Escudo de Garupá"
              sx={{ width: 82, height: 100, objectFit: "contain" }}
            />
            <Typography variant="h5" sx={{ textAlign: "center" }}>
              Patrimonio Garupá
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              Sistema de gestión patrimonial municipal
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={enviar}>
            <Stack spacing={2}>
              <TextField
                label="Usuario"
                value={nombreUsuario}
                onChange={(event) => {
                  setNombreUsuario(event.target.value);
                  if (error) setError("");
                }}
                autoComplete="username"
                autoFocus
                fullWidth
                required
              />
              <TextField
                label="Contraseña"
                type={mostrarPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError("");
                }}
                autoComplete="current-password"
                fullWidth
                required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          aria-label={
                            mostrarPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                          title={
                            mostrarPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                          onClick={() => setMostrarPassword((valor) => !valor)}
                        >
                          {mostrarPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={enviando}
                startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {enviando ? "Ingresando..." : "Ingresar"}
              </Button>
            </Stack>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", textAlign: "center", mt: 3 }}
          >
            Municipalidad de Garupá · Etapa 1
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
