import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
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
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { formatoMoneda } from "../lib/format";
import type { Bien, EstadoBien, Paginado, Rubro } from "../types";

export function BienesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [rubroId, setRubroId] = useState("");
  const [estadoId, setEstadoId] = useState("");
  const [activo, setActivo] = useState("");
  const [page, setPage] = useState(0);

  const { data: rubros } = useQuery<Rubro[]>({
    queryKey: ["rubros"],
    queryFn: async () => (await api.get("/catalogos/rubros")).data,
  });

  const { data: estados } = useQuery<EstadoBien[]>({
    queryKey: ["estados"],
    queryFn: async () => (await api.get("/catalogos/estados")).data,
  });

  const { data, isLoading, error, refetch } = useQuery<Paginado<Bien>>({
    queryKey: ["bienes", q, rubroId, estadoId, activo, page],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: 20,
      };
      if (q.trim()) params.q = q.trim();
      if (rubroId) params.rubroId = rubroId;
      if (estadoId) params.estadoId = estadoId;
      if (activo) params.activo = activo;
      return (await api.get("/bienes", { params })).data;
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
          <Typography variant="h4">Bienes registrables</Typography>
          <Typography color="text.secondary">
            Inventario permanente de bienes muebles e inmuebles.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/bienes/nuevo")}
        >
          Nuevo bien
        </Button>
      </Box>

      <Card sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(220px, 1fr) 190px 190px 150px",
            },
            gap: 2,
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar por código, descripción, serie, patente..."
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
            value={rubroId}
            onChange={(event) => {
              setRubroId(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todos los rubros</MenuItem>
            {rubros?.map((rubro) => (
              <MenuItem key={rubro.id} value={String(rubro.id)}>
                {rubro.nombre}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            displayEmpty
            value={estadoId}
            onChange={(event) => {
              setEstadoId(event.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todos los estados</MenuItem>
            {estados?.map((estado) => (
              <MenuItem key={estado.id} value={String(estado.id)}>
                {estado.nombre}
              </MenuItem>
            ))}
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
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="true">Activos</MenuItem>
            <MenuItem value="false">Dados de baja</MenuItem>
          </Select>
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>N° identificación</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Rubro</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Área</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Situación</TableCell>
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
                      titulo="No se pudo cargar el listado de bienes"
                    />
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !error && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No se encontraron bienes.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {data?.items.map((bien) => (
                <TableRow
                  key={bien.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/bienes/${bien.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {bien.codigoInventario}
                    </Typography>
                  </TableCell>
                  <TableCell>{bien.numeroIdentificacion}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{bien.descripcion}</Typography>
                    {bien.marca && (
                      <Typography variant="caption" color="text.secondary">
                        {bien.marca} {bien.modelo ?? ""}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{bien.rubro?.nombre ?? "-"}</TableCell>
                  <TableCell>{bien.estado?.nombre ?? "-"}</TableCell>
                  <TableCell>{bien.area?.nombre ?? "-"}</TableCell>
                  <TableCell>
                    {bien.subresponsable
                      ? `${bien.subresponsable.apellido}, ${bien.subresponsable.nombre}`
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {formatoMoneda(bien.valorHistorico)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={bien.activo ? "Activo" : "Baja"}
                      color={bien.activo ? "success" : "default"}
                    />
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
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count}`
          }
        />
      </Card>
    </Stack>
  );
}
