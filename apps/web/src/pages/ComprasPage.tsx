import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
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
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { formatoFecha, formatoMoneda } from "../lib/format";
import type { Compra, Paginado } from "../types";

function totalCompra(compra: Compra) {
  return compra.detalles.reduce(
    (total, detalle) =>
      total + Number(detalle.cantidad) * Number(detalle.precioUnitario ?? 0),
    0,
  );
}

const estados: Record<
  Compra["estado"],
  { label: string; color: "default" | "warning" | "success" }
> = {
  REGISTRADA: { label: "Pendiente de recepción", color: "warning" },
  RECIBIDA_PARCIAL: { label: "Recepción parcial", color: "warning" },
  RECIBIDA: { label: "Recibida", color: "success" },
};

export function ComprasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch } = useQuery<Paginado<Compra>>({
    queryKey: ["compras", q, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: 20,
      };
      if (q.trim()) params.q = q.trim();
      return (await api.get("/compras", { params })).data;
    },
    refetchOnMount: "always",
  });

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
          <Typography variant="h4">Compras e ingresos</Typography>
          <Typography color="text.secondary">
            Compras, órdenes de pago y recepciones de bienes y consumibles.
          </Typography>
        </Box>
        {usuario?.rol === "CONTABLE" && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/compras/nueva")}
          >
            Nueva compra
          </Button>
        )}
      </Box>

      <Card sx={{ p: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por OP, proveedor o comprobante..."
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(0);
          }}
          fullWidth
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
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>OP</TableCell>
                <TableCell>Organismo</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Comprobantes</TableCell>
                <TableCell align="right">Ítems</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}

              {error && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 2 }}>
                    <ErrorCarga
                      error={error}
                      onRetry={() => void refetch()}
                      titulo="No se pudo cargar el listado de compras"
                    />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !error && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No hay compras registradas.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {data?.items.map((compra) => (
                <TableRow
                  key={compra.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/compras/${compra.id}`)}
                >
                  <TableCell>{formatoFecha(compra.fecha)}</TableCell>
                  <TableCell>{compra.numeroOrdenPago ?? "-"}</TableCell>
                  <TableCell>{compra.organismo}</TableCell>
                  <TableCell>
                    {compra.proveedorDatos?.nombre ?? compra.proveedor ?? "-"}
                  </TableCell>
                  <TableCell>
                    {compra.comprobantes.length === 0
                      ? "-"
                      : compra.comprobantes
                          .map(
                            (item) =>
                              `${item.tipo}${item.numero ? ` ${item.numero}` : ""}`,
                          )
                          .join(", ")}
                  </TableCell>
                  <TableCell align="right">{compra.detalles.length}</TableCell>
                  <TableCell align="right">
                    {formatoMoneda(totalCompra(compra))}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={estados[compra.estado].label}
                      color={estados[compra.estado].color}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/compras/${compra.id}`);
                      }}
                    >
                      {compra.estado === "RECIBIDA" ? "Ver" : "Recibir"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
    </Stack>
  );
}
