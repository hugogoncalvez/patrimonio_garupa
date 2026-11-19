import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PlaceIcon from "@mui/icons-material/Place";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { formatoFechaHora, formatoNumero } from "../lib/format";
import type { DashboardData } from "../types";

function StatCard({
  titulo,
  valor,
  detalle,
  icono,
  color,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  icono: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {titulo}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {valor}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {detalle}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              bgcolor: `${color}18`,
              color,
            }}
          >
            {icono}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
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
        titulo="No se pudo cargar el panel"
      />
    );
  }

  if (!data) {
    return <Alert severity="error">No se pudo cargar el panel.</Alert>;
  }

  const maxRubro = Math.max(1, ...data.bienesPorRubro.map((item) => item.cantidad));
  const maxArea = Math.max(1, ...data.bienesPorArea.map((item) => item.cantidad));

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          gap: 2,
          alignItems: { sm: "center" },
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box
            component="img"
            src="/escudo-icono.png"
            alt="Escudo de Garupá"
            sx={{
              width: 52,
              height: 63,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography variant="h4">Panel de patrimonio</Typography>
            <Typography color="text.secondary">
              Resumen operativo de bienes, consumibles y movimientos.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate("/reportes")}>
            Reportes
          </Button>
          <Button variant="outlined" onClick={() => navigate("/consumibles")}>
            Consumibles
          </Button>
          <Button variant="contained" onClick={() => navigate("/bienes/nuevo")}>
            Cargar bien
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 2,
        }}
      >
        <StatCard
          titulo="Bienes activos"
          valor={data.bienes.activos}
          detalle={`${data.bienes.total} registrados · ${data.bienes.baja} de baja`}
          icono={<Inventory2Icon />}
          color={theme.palette.primary.main}
        />
        <StatCard
          titulo="Consumibles activos"
          valor={data.consumibles.activos}
          detalle={`${data.consumibles.total} en catálogo`}
          icono={<WarehouseIcon />}
          color={theme.palette.mode === "dark" ? "#64b5f6" : "#1565c0"}
        />
        <StatCard
          titulo="Stock bajo"
          valor={data.consumibles.stockBajo}
          detalle="Requieren reposición"
          icono={<WarningAmberIcon />}
          color={theme.palette.warning.main}
        />
        <StatCard
          titulo="Compras del mes"
          valor={data.comprasMes}
          detalle="Ingresos registrados"
          icono={<ShoppingCartIcon />}
          color={theme.palette.mode === "dark" ? "#ce93d8" : "#6a1b9a"}
        />
        <StatCard
          titulo="Sin responsable"
          valor={data.bienes.sinResponsable}
          detalle="Bienes activos sin responsable directo ni de área"
          icono={<PersonOffIcon />}
          color={theme.palette.error.main}
        />
        <StatCard
          titulo="Sin ubicación"
          valor={data.bienes.sinUbicacion}
          detalle="Bienes activos sin área asignada"
          icono={<PlaceIcon />}
          color={theme.palette.warning.main}
        />
        <StatCard
          titulo="Áreas con bienes"
          valor={data.bienesPorArea.filter((item) => item.areaId !== null).length}
          detalle="Áreas con bienes activos"
          icono={<AccountTreeIcon />}
          color={theme.palette.info.main}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bienes por rubro
            </Typography>
            {data.bienesPorRubro.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Todavía no hay bienes activos.
              </Typography>
            ) : (
              <Stack spacing={1.6} sx={{ mt: 1 }}>
                {data.bienesPorRubro.map((item) => (
                  <Box key={item.rubroId}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: "space-between", mb: 0.5 }}
                    >
                      <Typography variant="body2">{item.nombre}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.cantidad}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(item.cantidad / maxRubro) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bienes por área
            </Typography>
            {data.bienesPorArea.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Todavía no hay bienes activos.
              </Typography>
            ) : (
              <Stack spacing={1.4} sx={{ mt: 1 }}>
                {data.bienesPorArea.map((item) => (
                  <Box key={item.areaId ?? "sin-area"}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: "space-between", mb: 0.5 }}
                    >
                      <Typography variant="body2">{item.nombre}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.cantidad}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(item.cantidad / maxArea) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={() => navigate("/reportes")}
            >
              Ver reportes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Reposición sugerida
            </Typography>
            {data.consumibles.detalleStockBajo.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No hay consumibles por debajo del stock mínimo.
              </Typography>
            ) : (
              <List dense disablePadding>
                {data.consumibles.detalleStockBajo.map((item, index) => (
                  <Box key={item.id}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem disableGutters>
                      <ListItemText
                        primary={item.nombre}
                        secondary={`Stock ${formatoNumero(item.stockActual)} ${item.unidadMedida} · mínimo ${formatoNumero(item.stockMinimo)}`}
                      />
                      <Chip size="small" color="warning" label="Reponer" />
                    </ListItem>
                  </Box>
                ))}
              </List>
            )}
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={() => navigate("/consumibles")}
            >
              Ver consumibles
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Movimientos recientes
          </Typography>
          {data.movimientosRecientes.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              Sin movimientos registrados.
            </Typography>
          ) : (
            <List dense disablePadding>
              {data.movimientosRecientes.map((movimiento, index) => (
                <Box key={movimiento.id}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem disableGutters>
                    <ListItemText
                      primary={movimiento.descripcion}
                      secondary={`${movimiento.categoria} · ${formatoFechaHora(movimiento.fecha)}${movimiento.usuario ? ` · ${movimiento.usuario.nombre} ${movimiento.usuario.apellido}` : ""}`}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
