import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError } from "../lib/errors";
import { formatoNumero, hoyISO } from "../lib/format";
import type {
  Area,
  Consumible,
  EntregaConsumible,
  Paginado,
} from "../types";

interface Linea {
  consumible: Consumible;
  cantidad: string;
}

export function EntregaFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [areaDestinoId, setAreaDestinoId] = useState("");
  const [firmanteNombre, setFirmanteNombre] = useState("");
  const [firmanteDni, setFirmanteDni] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const busquedaDiferida = useDeferredValue(busqueda);

  const { data: areas, isLoading: cargandoAreas, error: errorAreas } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/catalogos/areas")).data,
  });

  const { data: consumibles, isFetching: buscandoConsumibles, error: errorConsumibles } =
    useQuery<Paginado<Consumible>>({
      queryKey: ["consumibles-entrega", busquedaDiferida],
      queryFn: async () => {
        const params: Record<string, string | number> = {
          activo: "true",
          page: 1,
          limit: 50,
        };
        if (busquedaDiferida.trim()) params.q = busquedaDiferida.trim();
        return (await api.get("/consumibles", { params })).data;
      },
      staleTime: 30_000,
    });

  const errorCatalogos = errorAreas || errorConsumibles;

  const opciones = useMemo(() => {
    const seleccionados = new Set(lineas.map((linea) => linea.consumible.id));
    return (consumibles?.items ?? []).filter(
      (item) => Number(item.stockActual) > 0 && !seleccionados.has(item.id),
    );
  }, [consumibles, lineas]);

  const areasActivas = useMemo(
    () => (areas ?? []).filter((area) => area.activo),
    [areas],
  );

  const areaSeleccionada = useMemo(
    () => areasActivas.find((area) => String(area.id) === areaDestinoId),
    [areasActivas, areaDestinoId],
  );

  const cambiarArea = (value: string) => {
    setAreaDestinoId(value);
    const area = areasActivas.find((item) => String(item.id) === value);
    if (area?.responsable) {
      setFirmanteNombre(
        `${area.responsable.nombre} ${area.responsable.apellido}`.trim(),
      );
      setFirmanteDni(area.responsable.dni ?? "");
    } else if (area) {
      setFirmanteNombre("");
      setFirmanteDni("");
    }
  };

  const agregar = (consumible: Consumible | null) => {
    if (!consumible) return;
    setLineas((actuales) => [...actuales, { consumible, cantidad: "1" }]);
    setBusqueda("");
  };

  const cambiarCantidad = (id: number, valor: string) => {
    setLineas((actuales) =>
      actuales.map((linea) =>
        linea.consumible.id === id ? { ...linea, cantidad: valor } : linea,
      ),
    );
  };

  const quitar = (id: number) => {
    setLineas((actuales) =>
      actuales.filter((linea) => linea.consumible.id !== id),
    );
  };

  const dniLimpio = firmanteDni.replace(/\D/g, "");
  const dniValido = /^\d{7,8}$/.test(dniLimpio);
  const lineasValidas = lineas.every((linea) => {
    const cantidad = Number(linea.cantidad);
    return (
      Number.isFinite(cantidad) &&
      cantidad > 0 &&
      cantidad <= Number(linea.consumible.stockActual)
    );
  });

  const puedeGuardar =
    Boolean(areaDestinoId) &&
    Boolean(fecha) &&
    firmanteNombre.trim().length >= 3 &&
    dniValido &&
    lineas.length > 0 &&
    lineasValidas;

  const crear = useMutation({
    mutationFn: async () => {
      if (!puedeGuardar) {
        throw new Error("Completá los datos del acta y las cantidades");
      }

      return (
        await api.post<EntregaConsumible>("/entregas-consumibles", {
          fecha: fecha || undefined,
          areaDestinoId: Number(areaDestinoId),
          firmanteNombre: firmanteNombre.trim(),
          firmanteDni: dniLimpio,
          observaciones: observaciones.trim() || null,
          items: lineas.map((linea) => ({
            consumibleId: linea.consumible.id,
            cantidad: Number(linea.cantidad),
          })),
        })
      ).data;
    },
    onSuccess: async (entrega) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["consumibles"] }),
        queryClient.invalidateQueries({ queryKey: ["consumibles-entrega"] }),
        queryClient.invalidateQueries({ queryKey: ["entregas"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      navigate(`/entregas/${entrega.id}?nueva=1`);
    },
    onError: alertaError,
  });

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton onClick={() => navigate("/entregas")} title="Volver">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4">Nueva entrega de consumibles</Typography>
          <Typography color="text.secondary">
            Una entrega genera un acta con todas las líneas incluidas.
          </Typography>
        </Box>
      </Box>

      {errorCatalogos && (
        <ErrorCarga
          error={errorCatalogos}
          titulo="No se pudieron cargar las áreas o los consumibles"
        />
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Datos del acta
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              select
              label="Área destino"
              value={areaDestinoId}
              onChange={(event) => cambiarArea(event.target.value)}
              disabled={cargandoAreas}
              required
              helperText={
                areaSeleccionada?.responsable
                  ? "El firmante se completa con el responsable del área y puede modificarse."
                  : "Seleccioná el área que recibe."
              }
            >
              {areasActivas.map((area) => (
                <MenuItem key={area.id} value={String(area.id)}>
                  {area.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Fecha del acta"
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
            <TextField
              label="Firmante real"
              value={firmanteNombre}
              onChange={(event) => setFirmanteNombre(event.target.value)}
              helperText="Nombre y apellido de quien firma el acta."
              required
            />
            <TextField
              label="DNI del firmante"
              value={firmanteDni}
              onChange={(event) => setFirmanteDni(event.target.value)}
              helperText="7 u 8 dígitos."
              error={Boolean(firmanteDni) && !dniValido}
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 12 } }}
              required
            />
            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              multiline
              minRows={2}
              sx={{ gridColumn: { md: "1 / -1" } }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: "space-between",
              gap: 1.5,
              alignItems: { md: "center" },
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6">Consumibles entregados</Typography>
              <Typography variant="body2" color="text.secondary">
                Buscá y agregá cada consumible. Se descuenta stock al confirmar.
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {lineas.length} {lineas.length === 1 ? "línea" : "líneas"}
            </Typography>
          </Box>

          <Autocomplete
            options={opciones}
            value={null}
            inputValue={busqueda}
            onInputChange={(_event, value, reason) => {
              if (reason === "input" || reason === "clear") setBusqueda(value);
            }}
            onChange={(_event, value) => agregar(value)}
            getOptionLabel={(option) =>
              `${option.nombre} · ${formatoNumero(option.stockActual)} ${option.unidadMedida}`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={buscandoConsumibles}
            noOptionsText="Sin consumibles disponibles"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Buscar consumible"
                placeholder="Nombre o categoría"
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <>
                        {buscandoConsumibles ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.slotProps.input.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />

          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Consumible</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell sx={{ width: 150 }}>Cantidad</TableCell>
                  <TableCell align="right" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {lineas.map((linea) => {
                  const cantidad = Number(linea.cantidad);
                  const excede =
                    Number.isFinite(cantidad) &&
                    cantidad > Number(linea.consumible.stockActual);
                  return (
                    <TableRow key={linea.consumible.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {linea.consumible.nombre}
                        </Typography>
                        {linea.consumible.categoria ? (
                          <Typography variant="caption" color="text.secondary">
                            {linea.consumible.categoria.nombre}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="right">
                        {formatoNumero(linea.consumible.stockActual)}
                      </TableCell>
                      <TableCell>{linea.consumible.unidadMedida}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={linea.cantidad}
                          onChange={(event) =>
                            cambiarCantidad(
                              linea.consumible.id,
                              event.target.value,
                            )
                          }
                          error={
                            excede ||
                            !Number.isFinite(cantidad) ||
                            cantidad <= 0
                          }
                          helperText={excede ? "Supera el stock" : undefined}
                          slotProps={{ htmlInput: { step: 1, min: "0" } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          title="Quitar"
                          onClick={() => quitar(linea.consumible.id)}
                        >
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {lineas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 2, textAlign: "center" }}
                      >
                        Todavía no agregaste consumibles.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          <Alert severity="info">
            Se generará un acta con {lineas.length}{" "}
            {lineas.length === 1 ? "línea" : "líneas"}. El acta se podrá imprimir
            o descargar desde el detalle.
          </Alert>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1.5,
              mt: 2,
            }}
          >
            <Button onClick={() => navigate("/entregas")}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={() => crear.mutate()}
              disabled={!puedeGuardar || crear.isPending}
              startIcon={
                crear.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
            >
              {crear.isPending ? "Registrando..." : "Confirmar entrega"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
