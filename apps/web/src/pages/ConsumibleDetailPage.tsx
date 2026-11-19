import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { formatoFechaHora, formatoNumero } from "../lib/format";
import type { Consumible } from "../types";

const etiquetasTipo: Record<string, string> = {
  INGRESO: "Ingreso",
  ENTREGA: "Entrega",
  AJUSTE: "Ajuste",
};

export function ConsumibleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery<Consumible>({
    queryKey: ["consumible", id],
    queryFn: async () => (await api.get(`/consumibles/${id}`)).data,
    enabled: Boolean(id),
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
        titulo="No se pudo cargar el consumible"
      />
    );
  }

  if (!data) {
    return <Typography color="text.secondary">Consumible no encontrado.</Typography>;
  }

  const bajo = Number(data.stockActual) <= Number(data.stockMinimo);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/consumibles")}>
          Volver
        </Button>
      </Box>

      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="h4">{data.nombre}</Typography>
          <Chip
            size="small"
            label={data.activo ? "Activo" : "Inactivo"}
            color={data.activo ? "success" : "default"}
          />
        </Stack>
        <Typography color="text.secondary">
          {data.categoria?.nombre ?? "Sin categoría"} · {data.unidadMedida}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Stock actual
            </Typography>
            <Typography variant="h4" color={bajo ? "warning.main" : "text.primary"}>
              {formatoNumero(data.stockActual)} {data.unidadMedida}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Stock mínimo
            </Typography>
            <Typography variant="h4">
              {formatoNumero(data.stockMinimo)} {data.unidadMedida}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Situación
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5 }}>
              <Chip
                label={bajo ? "Requiere reposición" : "Stock suficiente"}
                color={bajo ? "warning" : "success"}
              />
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Historial de movimientos
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell>Destino</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Observaciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.movimientos ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">
                        Sin movimientos registrados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  (data.movimientos ?? []).map((movimiento) => (
                    <TableRow key={movimiento.id} hover>
                      <TableCell>{formatoFechaHora(movimiento.fecha)}</TableCell>
                      <TableCell>{etiquetasTipo[movimiento.tipo] ?? movimiento.tipo}</TableCell>
                      <TableCell align="right">
                        {formatoNumero(movimiento.cantidad)}
                      </TableCell>
                      <TableCell>{movimiento.areaDestino?.nombre ?? "-"}</TableCell>
                      <TableCell>
                        {movimiento.entrega
                          ? `Entrega ${movimiento.entrega.numero}`
                          : movimiento.compra
                            ? `Compra #${movimiento.compra.id}`
                            : movimiento.tipo === "INGRESO"
                              ? "Stock inicial"
                              : "-"}
                      </TableCell>
                      <TableCell>
                        {movimiento.usuario
                          ? `${movimiento.usuario.apellido}, ${movimiento.usuario.nombre}`
                          : "-"}
                      </TableCell>
                      <TableCell>{movimiento.observaciones ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}
