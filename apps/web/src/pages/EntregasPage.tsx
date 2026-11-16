import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  Chip,
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
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { formatoFecha } from "../lib/format";
import type { Area, EntregaConsumible, Paginado } from "../types";

export function EntregasPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [areaId, setAreaId] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(0);

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/catalogos/areas")).data,
  });

  const { data, isLoading, error, refetch } = useQuery<Paginado<EntregaConsumible>>({
    queryKey: ["entregas", q, areaId, estado, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: 20,
      };
      if (q.trim()) params.q = q.trim();
      if (areaId) params.areaId = areaId;
      if (estado) params.estado = estado;
      return (await api.get("/entregas-consumibles", { params })).data;
    },
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
          <Typography variant="h4">Entregas de consumibles</Typography>
          <Typography color="text.secondary">
            Actas de entrega con una o varias líneas.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/entregas/nueva")}
        >
          Nueva entrega
        </Button>
      </Box>

      <Card sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 220px 180px" },
            gap: 2,
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar por acta, área o firmante..."
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
            value={areaId}
            onChange={(event) => {
              setAreaId(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas las áreas</MenuItem>
            {areas?.map((area) => (
              <MenuItem key={area.id} value={String(area.id)}>
                {area.nombre}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            displayEmpty
            value={estado}
            onChange={(event) => {
              setEstado(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todos los estados</MenuItem>
            <MenuItem value="REGISTRADA">Registradas</MenuItem>
            <MenuItem value="ANULADA">Anuladas</MenuItem>
          </Select>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Acta</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Área destino</TableCell>
                <TableCell>Firmante</TableCell>
                <TableCell align="right">Líneas</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Cargando entregas...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}

              {error ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 2 }}>
                    <ErrorCarga
                      error={error}
                      onRetry={() => void refetch()}
                      titulo="No se pudo cargar el listado de entregas"
                    />
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading &&
                data?.items.map((entrega) => (
                  <TableRow key={entrega.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {entrega.numero}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatoFecha(entrega.fecha)}</TableCell>
                    <TableCell>{entrega.areaNombreSnapshot}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entrega.firmanteNombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        DNI {entrega.firmanteDni}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {entrega._count?.movimientos ?? 0}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          entrega.estado === "ANULADA" ? "Anulada" : "Registrada"
                        }
                        color={
                          entrega.estado === "ANULADA" ? "error" : "success"
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="Ver detalle"
                        onClick={() => navigate(`/entregas/${entrega.id}`)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

              {!isLoading && !error && data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: 3, textAlign: "center" }}
                    >
                      No hay entregas registradas.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_event, value) => setPage(value)}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count}`
          }
        />
      </Card>
    </Stack>
  );
}
