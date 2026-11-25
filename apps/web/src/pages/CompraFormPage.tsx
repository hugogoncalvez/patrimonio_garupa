import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError } from "../lib/errors";
import { formatoMoneda, hoyISO } from "../lib/format";
import type {
  Area,
  Compra,
  CompraComprobante,
  Consumible,
  Paginado,
  Proveedor,
  Rubro,
} from "../types";

interface DetalleForm {
  key: string;
  tipo: "INVENTARIABLE" | "CONSUMIBLE";
  rubroId: string;
  consumible: Consumible | null;
  cantidad: string;
  precioUnitario: string;
  descripcion: string;
}

const tiposComprobante = ["FACTURA", "REMITO", "TICKET", "OTRO"];

function clave() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nuevoDetalle(): DetalleForm {
  return {
    key: clave(),
    tipo: "INVENTARIABLE",
    rubroId: "",
    consumible: null,
    cantidad: "1",
    precioUnitario: "",
    descripcion: "",
  };
}

function nuevoComprobante(): CompraComprobante {
  return { tipo: "FACTURA", numero: "", fecha: "" };
}

function SelectorConsumible({
  value,
  onChange,
  onAgregar,
}: {
  value: Consumible | null;
  onChange: (value: Consumible | null) => void;
  onAgregar: (nombre: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const busqueda = useDeferredValue(texto);

  const { data, error, isLoading } = useQuery<Paginado<Consumible>>({
    queryKey: ["consumibles-compra", busqueda],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        activo: "true",
        page: 1,
        limit: 100,
      };
      if (busqueda.trim()) params.q = busqueda.trim();
      return (await api.get("/consumibles", { params })).data;
    },
    staleTime: 30_000,
  });

  return (
    <Autocomplete<Consumible | string, false, false, true>
      options={(data?.items ?? []) as (Consumible | string)[]}
      value={value}
      loading={isLoading}
      onInputChange={(_event, nuevo, reason) => {
        if (reason === "input" || reason === "clear") setTexto(nuevo);
      }}
      onChange={(_event, nuevo) => {
        if (typeof nuevo === "string") {
          onAgregar(nuevo.replace(/^Agregar "|"$/g, ""));
          return;
        }
        onChange(nuevo);
      }}
      getOptionLabel={(option) =>
        typeof option === "string"
          ? option
          : `${option.nombre} · ${option.unidadMedida}`
      }
      isOptionEqualToValue={(option, selected) =>
        typeof option === "string" || typeof selected === "string"
          ? false
          : option.id === selected.id
      }
      filterOptions={(options, params) => {
        const existentes = options.filter(
          (item): item is Consumible => typeof item !== "string",
        );
        const etiquetaSeleccionada = value
          ? `${value.nombre} · ${value.unidadMedida}`
          : null;
        if (params.inputValue === etiquetaSeleccionada) return existentes;
        const termino = params.inputValue.trim().toLowerCase();
        if (
          termino &&
          !existentes.some(
            (item) => item.nombre.toLowerCase() === termino,
          )
        ) {
          return [
            ...existentes,
            `Agregar "${params.inputValue.trim()}"`,
          ];
        }
        return existentes;
      }}
      noOptionsText="Sin consumibles. Escribí un nombre para agregarlo."
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Consumible"
          placeholder="Buscar o agregar"
          error={Boolean(error)}
          helperText={error ? "No se pudieron cargar los consumibles" : undefined}
        />
      )}
    />
  );
}

export function CompraFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(hoyISO());
  const [organismo, setOrganismo] = useState<"DE" | "HCD">("DE");
  const [areaDestinoId, setAreaDestinoId] = useState("");
  const [numeroOrdenPago, setNumeroOrdenPago] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [proveedorTexto, setProveedorTexto] = useState("");
  const [comprobantes, setComprobantes] = useState<CompraComprobante[]>([
    nuevoComprobante(),
  ]);
  const [detalles, setDetalles] = useState<DetalleForm[]>([nuevoDetalle()]);

  const [proveedorModal, setProveedorModal] = useState<string | null>(null);
  const [proveedorForm, setProveedorForm] = useState({
    nombre: "",
    cuit: "",
    telefono: "",
    email: "",
    direccion: "",
  });

  const [consumibleModal, setConsumibleModal] = useState<{
    nombre: string;
    detalleKey: string;
  } | null>(null);
  const [consumibleForm, setConsumibleForm] = useState({
    nombre: "",
    categoriaId: "",
    unidadMedida: "unidad",
    stockMinimo: "0",
  });

  const busquedaProveedor = useDeferredValue(proveedorTexto);

  const { data: proveedores, error: errorProveedores } = useQuery<Proveedor[]>({
    queryKey: ["proveedores", busquedaProveedor],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (busquedaProveedor.trim()) params.q = busquedaProveedor.trim();
      return (await api.get("/proveedores", { params })).data;
    },
    staleTime: 30_000,
  });

  const { data: rubros, error: errorRubros } = useQuery<Rubro[]>({
    queryKey: ["rubros"],
    queryFn: async () => (await api.get("/catalogos/rubros")).data,
  });

  const { data: areas } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/catalogos/areas")).data,
  });

  const { data: categoriasConsumible } = useQuery<
    { id: number; nombre: string }[]
  >({
    queryKey: ["categorias-consumibles"],
    queryFn: async () => (await api.get("/catalogos/categorias-consumibles")).data,
  });

  const errorCatalogos = errorProveedores || errorRubros;

  const rubrosConCategoria = useMemo(
    () => (rubros ?? []).filter((rubro) => rubro.activo && rubro.codigoCategoria),
    [rubros],
  );

  const opcionesProveedor = useMemo(() => {
    const lista: (Proveedor | string)[] = [...(proveedores ?? [])];
    const texto = proveedorTexto.trim();
    if (
      texto &&
      !(proveedores ?? []).some(
        (item) => item.nombre.toLowerCase() === texto.toLowerCase(),
      )
    ) {
      lista.push(`Agregar "${texto}"`);
    }
    return lista;
  }, [proveedores, proveedorTexto]);

  const crearProveedor = useMutation({
    mutationFn: async () =>
      (
        await api.post("/proveedores", {
          nombre: proveedorForm.nombre.trim(),
          cuit: proveedorForm.cuit.trim() || null,
          telefono: proveedorForm.telefono.trim() || null,
          email: proveedorForm.email.trim() || null,
          direccion: proveedorForm.direccion.trim() || null,
        })
      ).data as Proveedor,
    onSuccess: async (creado) => {
      await queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      setProveedor(creado);
      setProveedorTexto(creado.nombre);
      setProveedorModal(null);
      setProveedorForm({
        nombre: "",
        cuit: "",
        telefono: "",
        email: "",
        direccion: "",
      });
    },
    onError: alertaError,
  });

  const crearConsumible = useMutation({
    mutationFn: async () =>
      (
        await api.post("/consumibles", {
          nombre: consumibleForm.nombre.trim(),
          categoriaId: consumibleForm.categoriaId
            ? Number(consumibleForm.categoriaId)
            : null,
          unidadMedida: consumibleForm.unidadMedida.trim() || "unidad",
          stockMinimo: Number(consumibleForm.stockMinimo || 0),
          stockActual: 0,
        })
      ).data as Consumible,
    onSuccess: async (creado) => {
      await queryClient.invalidateQueries({ queryKey: ["consumibles"] });
      await queryClient.invalidateQueries({ queryKey: ["consumibles-compra"] });
      const key = consumibleModal?.detalleKey;
      const detalle = key
        ? detalles.find((item) => item.key === key)
        : detalles.find(
            (item) => item.tipo === "CONSUMIBLE" && item.consumible === null,
          );
      if (detalle) {
        actualizar(detalle.key, { consumible: creado });
      }
      setConsumibleModal(null);
      setConsumibleForm({
        nombre: "",
        categoriaId: "",
        unidadMedida: "unidad",
        stockMinimo: "0",
      });
    },
    onError: alertaError,
  });

  const abrirProveedor = (nombre: string) => {
    setProveedorForm({
      nombre,
      cuit: "",
      telefono: "",
      email: "",
      direccion: "",
    });
    setProveedorModal(nombre);
  };

  const abrirConsumible = (nombre: string, detalleKey: string) => {
    setConsumibleForm({
      nombre,
      categoriaId: "",
      unidadMedida: "unidad",
      stockMinimo: "0",
    });
    setConsumibleModal({ nombre, detalleKey });
  };

  const actualizar = (key: string, cambios: Partial<DetalleForm>) => {
    setDetalles((actuales) =>
      actuales.map((detalle) =>
        detalle.key === key ? { ...detalle, ...cambios } : detalle,
      ),
    );
  };

  const total = detalles.reduce(
    (suma, detalle) =>
      suma + Number(detalle.cantidad || 0) * Number(detalle.precioUnitario || 0),
    0,
  );

  const guardar = useMutation({
    mutationFn: async () => {
      if (!proveedor) {
        throw new Error("Seleccioná un proveedor de la lista o creá uno nuevo");
      }
      if (detalles.length === 0) {
        throw new Error("Agregá al menos un ítem");
      }

      const payloadDetalles = detalles.map((detalle) => {
        const cantidad = Number(detalle.cantidad);
        if (!(cantidad > 0)) {
          throw new Error("La cantidad de cada ítem debe ser mayor a cero");
        }

        if (detalle.tipo === "INVENTARIABLE") {
          if (!detalle.rubroId) {
            throw new Error("Seleccioná la categoría de cada bien");
          }
          if (!Number.isInteger(cantidad)) {
            throw new Error("La cantidad de bienes debe ser un número entero");
          }
          if (!detalle.descripcion.trim()) {
            throw new Error("Ingresá la descripción de cada bien");
          }
          return {
            tipo: "INVENTARIABLE",
            rubroId: Number(detalle.rubroId),
            cantidad,
            precioUnitario: detalle.precioUnitario
              ? Number(detalle.precioUnitario)
              : null,
            descripcion: detalle.descripcion.trim(),
          };
        }

        if (!detalle.consumible) {
          throw new Error("Seleccioná un consumible en cada ítem");
        }
        return {
          tipo: "CONSUMIBLE",
          consumibleId: detalle.consumible.id,
          cantidad,
          precioUnitario: detalle.precioUnitario
            ? Number(detalle.precioUnitario)
            : null,
          descripcion: detalle.descripcion.trim() || null,
        };
      });

      const payloadComprobantes = comprobantes
        .filter((item) => item.tipo && (item.numero?.trim() || item.fecha))
        .map((item) => ({
          tipo: item.tipo,
          numero: item.numero?.trim() || null,
          fecha: item.fecha
            ? new Date(`${item.fecha}T12:00:00`).toISOString()
            : null,
        }));

      return (
        await api.post("/compras", {
          fecha: new Date(`${fecha}T12:00:00`).toISOString(),
          organismo,
          areaDestinoId: areaDestinoId ? Number(areaDestinoId) : null,
          numeroOrdenPago: numeroOrdenPago.trim() || null,
          proveedorId: proveedor.id,
          observaciones: observaciones.trim() || null,
          comprobantes: payloadComprobantes,
          detalles: payloadDetalles,
        })
      ).data as Compra;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["compras"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const Swal = (await import("sweetalert2")).default;
      await Swal.fire({
        icon: "success",
        title: "Compra registrada",
        text: "Queda pendiente de recepción.",
        confirmButtonColor: "#0f4c3a",
      });
      navigate("/compras");
    },
    onError: alertaError,
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/compras")}>
          Volver
        </Button>
      </Box>

      <Box>
        <Typography variant="h4">Nueva compra o ingreso</Typography>
        <Typography color="text.secondary">
          Cargá la orden de pago y los ítems. Los bienes se generan al recibir
          el acta; los consumibles actualizan stock en ese momento.
        </Typography>
      </Box>

      {errorCatalogos && (
        <ErrorCarga
          error={errorCatalogos}
          titulo="No se pudieron cargar los catálogos"
        />
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Datos de la compra
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <TextField
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
            <TextField
              select
              label="Organismo"
              value={organismo}
              onChange={(event) =>
                setOrganismo(event.target.value as "DE" | "HCD")
              }
            >
              <MenuItem value="DE">Departamento Ejecutivo</MenuItem>
              <MenuItem value="HCD">Honorable Concejo Deliberante</MenuItem>
            </TextField>
            <TextField
              select
              label="Área destino"
              value={areaDestinoId}
              onChange={(event) => setAreaDestinoId(event.target.value)}
              helperText="Opcional. Se usa para imputar los bienes al recibir la compra."
            >
              <MenuItem value="">Sin área definida</MenuItem>
              {(areas ?? [])
                .filter((area) => area.activo)
                .map((area) => (
                  <MenuItem key={area.id} value={String(area.id)}>
                    {area.nombre}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label="N° de orden de pago"
              value={numeroOrdenPago}
              onChange={(event) => setNumeroOrdenPago(event.target.value)}
            />
            <Autocomplete
              options={opcionesProveedor}
              value={proveedor}
              inputValue={proveedorTexto}
              onInputChange={(_event, value, reason) => {
                if (reason === "input" || reason === "clear") {
                  setProveedorTexto(value);
                  setProveedor(null);
                }
              }}
              onChange={(_event, value) => {
                if (typeof value === "string") {
                  setProveedor(null);
                  setProveedorTexto(value);
                  abrirProveedor(value.replace(/^Agregar "|"$/g, ""));
                  return;
                }
                setProveedor(value);
                setProveedorTexto(value?.nombre ?? "");
              }}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.nombre
              }
              isOptionEqualToValue={(option, value) =>
                typeof option === "string" ||
                typeof value === "string"
                  ? false
                  : option.id === value.id
              }
              filterOptions={(options) => options}
              noOptionsText="Sin proveedores. Escribí un nombre para agregarlo."
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  placeholder="Buscar o agregar proveedor"
                  required
                />
              )}
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
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}
          >
            <Box>
              <Typography variant="h6">Comprobantes</Typography>
              <Typography variant="body2" color="text.secondary">
                Podés cargar varios comprobantes para una misma orden de pago.
              </Typography>
            </Box>
            <Button
              startIcon={<AddIcon />}
              onClick={() =>
                setComprobantes((actuales) => [
                  ...actuales,
                  nuevoComprobante(),
                ])
              }
            >
              Agregar comprobante
            </Button>
          </Stack>

          <Stack spacing={1.5}>
            {comprobantes.map((comprobante, indice) => (
              <Box
                key={indice}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "160px 1fr 170px 48px",
                  },
                  gap: 1.5,
                  alignItems: "center",
                }}
              >
                <TextField
                  select
                  size="small"
                  label="Tipo"
                  value={comprobante.tipo}
                  onChange={(event) =>
                    setComprobantes((actuales) =>
                      actuales.map((item, posicion) =>
                        posicion === indice
                          ? { ...item, tipo: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  {tiposComprobante.map((tipo) => (
                    <MenuItem key={tipo} value={tipo}>
                      {tipo}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Número"
                  value={comprobante.numero ?? ""}
                  onChange={(event) =>
                    setComprobantes((actuales) =>
                      actuales.map((item, posicion) =>
                        posicion === indice
                          ? { ...item, numero: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <TextField
                  size="small"
                  label="Fecha"
                  type="date"
                  value={comprobante.fecha ?? ""}
                  onChange={(event) =>
                    setComprobantes((actuales) =>
                      actuales.map((item, posicion) =>
                        posicion === indice
                          ? { ...item, fecha: event.target.value }
                          : item,
                      ),
                    )
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    setComprobantes((actuales) =>
                      actuales.filter((_item, posicion) => posicion !== indice),
                    )
                  }
                  disabled={comprobantes.length === 1}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <Box>
              <Typography variant="h6">Ítems</Typography>
              <Typography variant="body2" color="text.secondary">
                Los bienes no llevan código todavía: se genera al confirmar el
                acta de recepción.
              </Typography>
            </Box>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setDetalles((actuales) => [...actuales, nuevoDetalle()])}
            >
              Agregar ítem
            </Button>
          </Stack>

          <Stack spacing={2}>
            {detalles.map((detalle) => (
              <Card key={detalle.key} variant="outlined">
                <CardContent>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "170px minmax(240px, 1.4fr) 150px 150px 110px 48px",
                      },
                      gap: 1.5,
                      alignItems: "start",
                    }}
                  >
                    <TextField
                      select
                      size="small"
                      label="Tipo"
                      value={detalle.tipo}
                      onChange={(event) => {
                        const tipo = event.target.value as DetalleForm["tipo"];
                        actualizar(detalle.key, {
                          tipo,
                          rubroId: "",
                          consumible: null,
                          descripcion: "",
                        });
                      }}
                    >
                      <MenuItem value="INVENTARIABLE">Bien inventariable</MenuItem>
                      <MenuItem value="CONSUMIBLE">Consumible</MenuItem>
                    </TextField>

                    {detalle.tipo === "INVENTARIABLE" ? (
                      <TextField
                        select
                        size="small"
                        label="Categoría"
                        value={detalle.rubroId}
                        onChange={(event) =>
                          actualizar(detalle.key, { rubroId: event.target.value })
                        }
                        helperText={
                          rubrosConCategoria.length === 0
                            ? "Configurá códigos de categoría en Catálogos"
                            : undefined
                        }
                      >
                        {rubrosConCategoria.map((rubro) => (
                          <MenuItem key={rubro.id} value={String(rubro.id)}>
                            {rubro.codigoCategoria} · {rubro.nombre}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <SelectorConsumible
                        value={detalle.consumible}
                        onChange={(value) =>
                          actualizar(detalle.key, { consumible: value })
                        }
                        onAgregar={(nombre) =>
                          abrirConsumible(nombre, detalle.key)
                        }
                      />
                    )}

                    <TextField
                      size="small"
                      label="Cantidad"
                      type="number"
                      value={detalle.cantidad}
                      onChange={(event) =>
                        actualizar(detalle.key, { cantidad: event.target.value })
                      }
                      slotProps={{
                        htmlInput: {
                          min: detalle.tipo === "INVENTARIABLE" ? 1 : 0,
                          step: 1,
                        },
                      }}
                    />
                    <TextField
                      size="small"
                      label="Precio unitario"
                      type="number"
                      value={detalle.precioUnitario}
                      onChange={(event) =>
                        actualizar(detalle.key, {
                          precioUnitario: event.target.value,
                        })
                      }
                      slotProps={{ htmlInput: { min: 0, step: 1 } }}
                    />
                    <Box sx={{ pt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Subtotal
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatoMoneda(
                          Number(detalle.cantidad || 0) *
                            Number(detalle.precioUnitario || 0),
                        )}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      sx={{ mt: 0.5 }}
                      onClick={() =>
                        setDetalles((actuales) =>
                          actuales.filter((item) => item.key !== detalle.key),
                        )
                      }
                      disabled={detalles.length === 1}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>

                    {detalle.tipo === "INVENTARIABLE" && (
                      <TextField
                        size="small"
                        label="Descripción del bien"
                        value={detalle.descripcion}
                        onChange={(event) =>
                          actualizar(detalle.key, {
                            descripcion: event.target.value,
                          })
                        }
                        placeholder="Ej.: Silla de oficina con apoyabrazos"
                        sx={{ gridColumn: { md: "2 / -1" } }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "flex-end", mt: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              Total estimado
            </Typography>
            <Typography variant="h6">{formatoMoneda(total)}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={() => navigate("/compras")}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={
            guardar.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending}
        >
          {guardar.isPending ? "Guardando..." : "Registrar compra"}
        </Button>
      </Stack>

      <Dialog
        open={proveedorModal !== null}
        onClose={() => setProveedorModal(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Agregar proveedor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre o razón social"
              value={proveedorForm.nombre}
              onChange={(event) =>
                setProveedorForm({ ...proveedorForm, nombre: event.target.value })
              }
              required
            />
            <TextField
              label="CUIT"
              value={proveedorForm.cuit}
              onChange={(event) =>
                setProveedorForm({ ...proveedorForm, cuit: event.target.value })
              }
            />
            <TextField
              label="Teléfono"
              value={proveedorForm.telefono}
              onChange={(event) =>
                setProveedorForm({
                  ...proveedorForm,
                  telefono: event.target.value,
                })
              }
            />
            <TextField
              label="Email"
              value={proveedorForm.email}
              onChange={(event) =>
                setProveedorForm({ ...proveedorForm, email: event.target.value })
              }
            />
            <TextField
              label="Dirección"
              value={proveedorForm.direccion}
              onChange={(event) =>
                setProveedorForm({
                  ...proveedorForm,
                  direccion: event.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProveedorModal(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => crearProveedor.mutate()}
            disabled={crearProveedor.isPending || !proveedorForm.nombre.trim()}
          >
            {crearProveedor.isPending ? "Guardando..." : "Agregar proveedor"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={consumibleModal !== null}
        onClose={() => setConsumibleModal(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Agregar consumible</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={consumibleForm.nombre}
              onChange={(event) =>
                setConsumibleForm({
                  ...consumibleForm,
                  nombre: event.target.value,
                })
              }
              required
            />
            <TextField
              select
              label="Categoría"
              value={consumibleForm.categoriaId}
              onChange={(event) =>
                setConsumibleForm({
                  ...consumibleForm,
                  categoriaId: event.target.value,
                })
              }
            >
              <MenuItem value="">Sin categoría</MenuItem>
              {(categoriasConsumible ?? []).map((categoria) => (
                <MenuItem key={categoria.id} value={String(categoria.id)}>
                  {categoria.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Unidad de medida"
              value={consumibleForm.unidadMedida}
              onChange={(event) =>
                setConsumibleForm({
                  ...consumibleForm,
                  unidadMedida: event.target.value,
                })
              }
            />
            <TextField
              label="Stock mínimo"
              type="number"
              value={consumibleForm.stockMinimo}
              onChange={(event) =>
                setConsumibleForm({
                  ...consumibleForm,
                  stockMinimo: event.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsumibleModal(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => crearConsumible.mutate()}
            disabled={
              crearConsumible.isPending || !consumibleForm.nombre.trim()
            }
          >
            {crearConsumible.isPending ? "Guardando..." : "Agregar consumible"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
