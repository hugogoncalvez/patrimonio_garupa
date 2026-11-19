import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
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
import PrintIcon from "@mui/icons-material/Print";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import {
  formatoFecha,
  formatoFechaHora,
  formatoMoneda,
  formatoNumero,
  hoyISO,
} from "../lib/format";
import type {
  Area,
  CategoriaConsumible,
  Compra,
  Persona,
  ReporteBienesPorArea,
  ReporteBienesPorResponsable,
  ReporteComprasPeriodo,
  ReporteConsumiblesStock,
  ReporteMovimientosStock,
} from "../types";

const estadosCompra: Record<
  Compra["estado"],
  { label: string; color: "default" | "warning" | "success" }
> = {
  REGISTRADA: { label: "Pendiente", color: "warning" },
  RECIBIDA_PARCIAL: { label: "Parcial", color: "warning" },
  RECIBIDA: { label: "Recibida", color: "success" },
};

function totalCompra(compra: Compra) {
  return compra.detalles.reduce(
    (total, detalle) =>
      total + Number(detalle.cantidad) * Number(detalle.precioUnitario ?? 0),
    0,
  );
}

function nombrePersona(
  persona:
    | { nombre: string; apellido: string }
    | null
    | undefined,
) {
  return persona ? `${persona.apellido}, ${persona.nombre}` : "-";
}

function TablaVacia({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 5 }}>
        <Typography color="text.secondary">Sin resultados para los filtros.</Typography>
      </TableCell>
    </TableRow>
  );
}

export function ReportesPage() {
  const navigate = useNavigate();
  const hoy = hoyISO();
  const [tab, setTab] = useState(0);
  const [desde, setDesde] = useState(`${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [areaId, setAreaId] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/catalogos/areas")).data,
  });

  const { data: personas } = useQuery<Persona[]>({
    queryKey: ["personas"],
    queryFn: async () => (await api.get("/catalogos/personas")).data,
  });

  const { data: categorias } = useQuery<CategoriaConsumible[]>({
    queryKey: ["categorias-consumibles"],
    queryFn: async () =>
      (await api.get("/catalogos/categorias-consumibles")).data,
  });

  const reporteArea = useQuery<ReporteBienesPorArea>({
    queryKey: ["reporte-bienes-area", areaId, responsableId],
    enabled: tab === 0,
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (areaId) params.areaId = areaId;
      if (responsableId) params.responsableId = responsableId;
      return (await api.get("/reportes/bienes-por-area", { params })).data;
    },
  });

  const reporteResponsable = useQuery<ReporteBienesPorResponsable>({
    queryKey: ["reporte-bienes-responsable", areaId, responsableId],
    enabled: tab === 1,
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (areaId) params.areaId = areaId;
      if (responsableId) params.responsableId = responsableId;
      return (await api.get("/reportes/bienes-por-responsable", { params })).data;
    },
  });

  const reporteStock = useQuery<ReporteConsumiblesStock>({
    queryKey: ["reporte-consumibles-stock", categoriaId, soloStockBajo],
    enabled: tab === 2,
    queryFn: async () => {
      const params: Record<string, string | boolean> = {};
      if (categoriaId) params.categoriaId = categoriaId;
      if (soloStockBajo) params.soloStockBajo = "true";
      return (await api.get("/reportes/consumibles-stock", { params })).data;
    },
  });

  const reporteMovimientos = useQuery<ReporteMovimientosStock>({
    queryKey: ["reporte-movimientos", desde, hasta, areaId, tipo],
    enabled: tab === 3,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        desde,
        hasta,
      };
      if (areaId) params.areaId = areaId;
      if (tipo) params.tipo = tipo;
      return (await api.get("/reportes/movimientos-stock", { params })).data;
    },
  });

  const reporteCompras = useQuery<ReporteComprasPeriodo>({
    queryKey: ["reporte-compras", desde, hasta, areaId],
    enabled: tab === 4,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        desde,
        hasta,
      };
      if (areaId) params.areaId = areaId;
      return (await api.get("/reportes/compras-periodo", { params })).data;
    },
  });

  const consultaActiva = [reporteArea, reporteResponsable, reporteStock, reporteMovimientos, reporteCompras][tab];

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
          <Typography variant="h4">Reportes</Typography>
          <Typography color="text.secondary">
            Información operativa de bienes, consumibles, movimientos y compras.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
        >
          Imprimir
        </Button>
      </Box>

      <Card>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
        >
          <Tab label="Bienes por área" />
          <Tab label="Bienes por responsable" />
          <Tab label="Stock de consumibles" />
          <Tab label="Movimientos de stock" />
          <Tab label="Compras del período" />
        </Tabs>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
            {tab <= 1 && (
              <>
                <TextField
                  select
                  size="small"
                  label="Área"
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">Todas las áreas</MenuItem>
                  {(areas ?? [])
                    .filter((area) => area.activo)
                    .map((area) => (
                      <MenuItem key={area.id} value={String(area.id)}>
                        {area.nombre}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Responsable"
                  value={responsableId}
                  onChange={(event) => setResponsableId(event.target.value)}
                  sx={{ minWidth: 240 }}
                >
                  <MenuItem value="">Todos los responsables</MenuItem>
                  {(personas ?? [])
                    .filter((persona) => persona.activo)
                    .map((persona) => (
                      <MenuItem key={persona.id} value={String(persona.id)}>
                        {persona.apellido}, {persona.nombre}
                      </MenuItem>
                    ))}
                </TextField>
              </>
            )}

            {tab === 2 && (
              <>
                <TextField
                  select
                  size="small"
                  label="Categoría"
                  value={categoriaId}
                  onChange={(event) => setCategoriaId(event.target.value)}
                  sx={{ minWidth: 240 }}
                >
                  <MenuItem value="">Todas las categorías</MenuItem>
                  {(categorias ?? [])
                    .filter((categoria) => categoria.activo)
                    .map((categoria) => (
                      <MenuItem key={categoria.id} value={String(categoria.id)}>
                        {categoria.nombre}
                      </MenuItem>
                    ))}
                </TextField>
                <FormControlLabel
                  control={
                    <Switch
                      checked={soloStockBajo}
                      onChange={(event) => setSoloStockBajo(event.target.checked)}
                    />
                  }
                  label="Solo stock bajo"
                />
              </>
            )}

            {tab >= 3 && (
              <>
                <TextField
                  size="small"
                  type="date"
                  label="Desde"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 170 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="Hasta"
                  value={hasta}
                  onChange={(event) => setHasta(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 170 }}
                />
                <TextField
                  select
                  size="small"
                  label="Área"
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">Todas las áreas</MenuItem>
                  {(areas ?? [])
                    .filter((area) => area.activo)
                    .map((area) => (
                      <MenuItem key={area.id} value={String(area.id)}>
                        {area.nombre}
                      </MenuItem>
                    ))}
                </TextField>
                {tab === 3 && (
                  <TextField
                    select
                    size="small"
                    label="Tipo"
                    value={tipo}
                    onChange={(event) => setTipo(event.target.value)}
                    sx={{ minWidth: 170 }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="INGRESO">Ingreso</MenuItem>
                    <MenuItem value="ENTREGA">Entrega</MenuItem>
                    <MenuItem value="AJUSTE">Ajuste</MenuItem>
                  </TextField>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {consultaActiva.isLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 240 }}>
          <CircularProgress />
        </Box>
      ) : consultaActiva.error ? (
        <ErrorCarga
          error={consultaActiva.error}
          onRetry={() => void consultaActiva.refetch()}
          titulo="No se pudo cargar el reporte"
        />
      ) : tab === 0 ? (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumen por área
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Área</TableCell>
                      <TableCell>Responsable</TableCell>
                      <TableCell align="right">Bienes activos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(reporteArea.data?.resumen ?? []).length === 0 ? (
                      <TablaVacia colSpan={3} />
                    ) : (
                      (reporteArea.data?.resumen ?? []).map((item) => (
                        <TableRow key={item.areaId ?? "sin-area"}>
                          <TableCell>{item.area}</TableCell>
                          <TableCell>{item.responsable}</TableCell>
                          <TableCell align="right">{item.cantidad}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detalle de bienes
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Área</TableCell>
                      <TableCell>Responsable</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(reporteArea.data?.items ?? []).length === 0 ? (
                      <TablaVacia colSpan={5} />
                    ) : (
                      (reporteArea.data?.items ?? []).map((bien) => (
                        <TableRow
                          key={bien.id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => navigate(`/bienes/${bien.id}`)}
                        >
                          <TableCell>{bien.codigoInventario}</TableCell>
                          <TableCell>{bien.descripcion}</TableCell>
                          <TableCell>{bien.area?.nombre ?? "Sin área"}</TableCell>
                          <TableCell>
                            {bien.subresponsable
                              ? nombrePersona(bien.subresponsable)
                              : nombrePersona(bien.area?.responsable)}
                          </TableCell>
                          <TableCell>{bien.estado?.nombre ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Total: {reporteArea.data?.total ?? 0} bienes activos.
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      ) : tab === 1 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bienes por responsable
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Área</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reporteResponsable.data?.items ?? []).length === 0 ? (
                    <TablaVacia colSpan={5} />
                  ) : (
                    (reporteResponsable.data?.items ?? []).map((bien) => (
                      <TableRow
                        key={bien.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`/bienes/${bien.id}`)}
                      >
                        <TableCell>{bien.codigoInventario}</TableCell>
                        <TableCell>{bien.descripcion}</TableCell>
                        <TableCell>
                          {nombrePersona(bien.responsable)}
                        </TableCell>
                        <TableCell>{bien.area?.nombre ?? "Sin área"}</TableCell>
                        <TableCell>{bien.estado?.nombre ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Total: {reporteResponsable.data?.total ?? 0} bienes activos.
            </Typography>
          </CardContent>
        </Card>
      ) : tab === 2 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Stock de consumibles
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Consumible</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Mínimo</TableCell>
                    <TableCell>Unidad</TableCell>
                    <TableCell>Situación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reporteStock.data?.items ?? []).length === 0 ? (
                    <TablaVacia colSpan={6} />
                  ) : (
                    (reporteStock.data?.items ?? []).map((item) => {
                      const bajo =
                        Number(item.stockActual) <= Number(item.stockMinimo);
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => navigate(`/consumibles/${item.id}`)}
                        >
                          <TableCell>{item.nombre}</TableCell>
                          <TableCell>{item.categoria?.nombre ?? "-"}</TableCell>
                          <TableCell align="right">
                            {formatoNumero(item.stockActual)}
                          </TableCell>
                          <TableCell align="right">
                            {formatoNumero(item.stockMinimo)}
                          </TableCell>
                          <TableCell>{item.unidadMedida}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={bajo ? "Reponer" : "Suficiente"}
                              color={bajo ? "warning" : "success"}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Total: {reporteStock.data?.total ?? 0} consumibles.
            </Typography>
          </CardContent>
        </Card>
      ) : tab === 3 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Movimientos de stock
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Consumible</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Área destino</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Origen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reporteMovimientos.data?.items ?? []).length === 0 ? (
                    <TablaVacia colSpan={7} />
                  ) : (
                    (reporteMovimientos.data?.items ?? []).map((movimiento) => (
                      <TableRow key={movimiento.id} hover>
                        <TableCell>{formatoFechaHora(movimiento.fecha)}</TableCell>
                        <TableCell>
                          {movimiento.consumible?.nombre ??
                            movimiento.nombreConsumibleSnapshot ??
                            "-"}
                        </TableCell>
                        <TableCell>{movimiento.tipo}</TableCell>
                        <TableCell align="right">
                          {formatoNumero(movimiento.cantidad)}
                        </TableCell>
                        <TableCell>{movimiento.areaDestino?.nombre ?? "-"}</TableCell>
                        <TableCell>{nombrePersona(movimiento.usuario)}</TableCell>
                        <TableCell>
                          {movimiento.entrega
                            ? `Entrega ${movimiento.entrega.numero}`
                            : movimiento.compra
                              ? `Compra #${movimiento.compra.id}`
                              : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Total: {reporteMovimientos.data?.total ?? 0} movimientos.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1 }}
            >
              <Typography variant="h6">Compras del período</Typography>
              <Typography variant="h6">
                Total: {formatoMoneda(reporteCompras.data?.totalPeriodo ?? 0)}
              </Typography>
            </Stack>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>OP</TableCell>
                    <TableCell>Organismo</TableCell>
                    <TableCell>Área destino</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell align="right">Ítems</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reporteCompras.data?.items ?? []).length === 0 ? (
                    <TablaVacia colSpan={8} />
                  ) : (
                    (reporteCompras.data?.items ?? []).map((compra) => (
                      <TableRow
                        key={compra.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`/compras/${compra.id}`)}
                      >
                        <TableCell>{formatoFecha(compra.fecha)}</TableCell>
                        <TableCell>{compra.numeroOrdenPago ?? "-"}</TableCell>
                        <TableCell>{compra.organismo}</TableCell>
                        <TableCell>{compra.areaDestino?.nombre ?? "-"}</TableCell>
                        <TableCell>
                          {compra.proveedorDatos?.nombre ?? compra.proveedor ?? "-"}
                        </TableCell>
                        <TableCell align="right">{compra.detalles.length}</TableCell>
                        <TableCell align="right">
                          {formatoMoneda(totalCompra(compra))}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={estadosCompra[compra.estado].label}
                            color={estadosCompra[compra.estado].color}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {reporteCompras.data?.total ?? 0} compras registradas.
            </Typography>
          </CardContent>
        </Card>
      )}

    </Stack>
  );
}
