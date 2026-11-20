import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError, mensajeError } from "../lib/errors";
import { hoyISO } from "../lib/format";
import { etiquetaOrganismo, ORGANISMOS } from "../lib/organismos";
import {
  CAMPOS_ESPECIFICOS,
  SITUACIONES_INMUEBLE,
  campoObligatorio,
  campoVisible,
  estadoVisibleParaFamilia,
  etiquetaCampo,
  etiquetaFamilia,
} from "../lib/bienes";
import type {
  Area,
  Bien,
  EstadoBien,
  Organismo,
  Persona,
  Rubro,
  SituacionInmueble,
} from "../types";

const schema = z
  .object({
    organismo: z.string().superRefine((value, ctx) => {
      if (value !== "DE" && value !== "HCD") {
        ctx.addIssue({
          code: "custom",
          message: "Seleccioná un organismo",
        });
      }
    }),
    familia: z.enum([
      "INMUEBLE",
      "MUEBLE",
      "MAQUINARIA",
      "VEHICULO",
      "MAQUINARIA_VIAL",
      "BIBLIOTECA",
      "OTRO",
    ]),
    modoCodigo: z.enum(["AUTO", "MANUAL"]),
    codigoInventario: z.string().trim().max(40).optional(),
    descripcion: z.string().trim().min(1, "La descripción es obligatoria").max(300),
    rubroId: z.string().min(1, "Seleccioná un rubro"),
    estadoId: z.string().min(1, "Seleccioná un estado"),
    areaId: z.string().optional(),
    subresponsableId: z.string().optional(),
    tipoIncorporacion: z.enum(
      ["COMPRA", "DONACION", "TRANSFERENCIA", "PRESTAMO", "OTRO"],
      { error: "Seleccioná el tipo de incorporación" },
    ),
    fechaAlta: z.string().min(1, "La fecha de alta es obligatoria"),
    valorHistorico: z.string().optional(),
    marca: z.string().optional(),
    modelo: z.string().optional(),
    numeroSerie: z.string().optional(),
    numeroMotor: z.string().optional(),
    patente: z.string().optional(),
    material: z.string().optional(),
    medidas: z.string().optional(),
    color: z.string().optional(),
    situacionInmueble: z.string().optional(),
    tipoInmueble: z.string().optional(),
    domicilioInmueble: z.string().optional(),
    localidadInmueble: z.string().optional(),
    provinciaInmueble: z.string().optional(),
    codigoPostalInmueble: z.string().optional(),
    partidaInmobiliaria: z.string().optional(),
    nomenclaturaCatastral: z.string().optional(),
    matriculaInmobiliaria: z.string().optional(),
    superficieTerreno: z.string().optional(),
    superficieCubierta: z.string().optional(),
    destinoInmueble: z.string().optional(),
    fechaEscritura: z.string().optional(),
    numeroEscritura: z.string().optional(),
    notaria: z.string().optional(),
    observaciones: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modoCodigo === "MANUAL" && !data.codigoInventario?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["codigoInventario"],
        message: "El código es obligatorio en modo manual",
      });
    }

    for (const campo of CAMPOS_ESPECIFICOS) {
      if (!campoObligatorio(campo, data.familia)) continue;
      const valor = data[campo as keyof typeof data];
      if (!String(valor ?? "").trim()) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: `${etiquetaCampo(campo)} es obligatorio para este rubro`,
        });
      }
    }

    for (const campo of ["superficieTerreno", "superficieCubierta"] as const) {
      const valor = data[campo]?.trim();
      if (valor && (Number.isNaN(Number(valor)) || Number(valor) < 0)) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: "Ingresá una superficie válida",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const valoresIniciales: FormValues = {
  organismo: "",
  familia: "OTRO",
  modoCodigo: "AUTO",
  codigoInventario: "",
  descripcion: "",
  rubroId: "",
  estadoId: "",
  areaId: "",
  subresponsableId: "",
  tipoIncorporacion: "COMPRA",
  fechaAlta: hoyISO(),
  valorHistorico: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  numeroMotor: "",
  patente: "",
  material: "",
  medidas: "",
  color: "",
  situacionInmueble: "",
  tipoInmueble: "",
  domicilioInmueble: "",
  localidadInmueble: "",
  provinciaInmueble: "",
  codigoPostalInmueble: "",
  partidaInmobiliaria: "",
  nomenclaturaCatastral: "",
  matriculaInmobiliaria: "",
  superficieTerreno: "",
  superficieCubierta: "",
  destinoInmueble: "",
  fechaEscritura: "",
  numeroEscritura: "",
  notaria: "",
  observaciones: "",
};

interface ProximoCodigo {
  codigo: string;
  organismo: Organismo;
  rubroId: number;
  codigoCategoria: number;
}

function organismoDesdeCodigo(codigo: string): Organismo | "" {
  if (codigo.startsWith("1-")) return "DE";
  if (codigo.startsWith("2-")) return "HCD";
  return "";
}

export function BienFormPage() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const { data: rubros, error: errorRubros } = useQuery<Rubro[]>({
    queryKey: ["rubros"],
    queryFn: async () => (await api.get("/catalogos/rubros")).data,
  });

  const { data: estados, error: errorEstados } = useQuery<EstadoBien[]>({
    queryKey: ["estados"],
    queryFn: async () => (await api.get("/catalogos/estados")).data,
  });

  const { data: areas, error: errorAreas } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => (await api.get("/catalogos/areas")).data,
  });

  const { data: personas, error: errorPersonas } = useQuery<Persona[]>({
    queryKey: ["personas"],
    queryFn: async () => (await api.get("/catalogos/personas")).data,
  });

  const { data: bien, isLoading: cargandoBien, error: errorBien } = useQuery<Bien>({
    queryKey: ["bien", id],
    queryFn: async () => (await api.get(`/bienes/${id}`)).data,
    enabled: esEdicion,
  });

  const errorCatalogos =
    errorRubros || errorEstados || errorAreas || errorPersonas || errorBien;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresIniciales,
  });

  const organismo = useWatch({ control, name: "organismo" });
  const familia = useWatch({ control, name: "familia" });
  const rubroId = useWatch({ control, name: "rubroId" });
  const estadoId = useWatch({ control, name: "estadoId" });
  const modoCodigo = useWatch({ control, name: "modoCodigo" });
  const esInmueble = familia === "INMUEBLE";
  const rubroSeleccionado = rubros?.find(
    (rubro) => String(rubro.id) === rubroId,
  );
  const estadosVisibles = estados?.filter((estado) =>
    estadoVisibleParaFamilia(estado.nombre, familia),
  );

  const mostrar = (campo: (typeof CAMPOS_ESPECIFICOS)[number]) =>
    campoVisible(campo, familia);

  const requerido = (campo: (typeof CAMPOS_ESPECIFICOS)[number]) =>
    campoObligatorio(campo, familia);

  const cambiarRubro = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => void,
  ) => {
    const nuevoRubroId = event.target.value;
    const nuevaFamilia =
      rubros?.find((rubro) => String(rubro.id) === nuevoRubroId)?.familia ??
      "OTRO";

    if (nuevaFamilia !== familia) {
      for (const campo of CAMPOS_ESPECIFICOS) {
        if (!campoVisible(campo, nuevaFamilia)) {
          setValue(campo as keyof FormValues, "", { shouldValidate: false });
        }
      }

      const estadoActual = estados?.find(
        (estado) => String(estado.id) === estadoId,
      );

      if (
        estadoActual &&
        !estadoVisibleParaFamilia(estadoActual.nombre, nuevaFamilia)
      ) {
        setValue("estadoId", "", { shouldValidate: false });
      }

      setValue("familia", nuevaFamilia, { shouldValidate: false });
    }

    onChange(event);
  };

  useEffect(() => {
    if (!estadoId || !estados) return;
    const estadoActual = estados.find(
      (estado) => String(estado.id) === estadoId,
    );
    if (
      estadoActual &&
      !estadoVisibleParaFamilia(estadoActual.nombre, familia)
    ) {
      setValue("estadoId", "", { shouldValidate: false });
    }
  }, [estadoId, estados, familia, setValue]);

  const {
    data: proximoCodigo,
    isFetching: generandoCodigo,
    error: errorCodigo,
  } = useQuery<ProximoCodigo>({
    queryKey: ["proximo-codigo-bien", organismo, rubroId],
    queryFn: async () =>
      (
        await api.get("/bienes/proximo-codigo", {
          params: { organismo, rubroId: Number(rubroId) },
        })
      ).data,
    enabled:
      !esEdicion &&
      modoCodigo === "AUTO" &&
      Boolean(organismo && rubroId),
  });

  useEffect(() => {
    if (!bien) return;

    reset({
      organismo: bien.organismo ?? organismoDesdeCodigo(bien.codigoInventario),
      familia: bien.rubro?.familia ?? "OTRO",
      modoCodigo: esEdicion ? "MANUAL" : "AUTO",
      codigoInventario: bien.codigoInventario,
      descripcion: bien.descripcion,
      rubroId: String(bien.rubroId),
      estadoId: String(bien.estadoId),
      areaId: bien.areaId ? String(bien.areaId) : "",
      subresponsableId: bien.subresponsableId
        ? String(bien.subresponsableId)
        : "",
      tipoIncorporacion:
        (bien.tipoIncorporacion as FormValues["tipoIncorporacion"]) ??
        "COMPRA",
      fechaAlta: bien.fechaAlta.slice(0, 10),
      valorHistorico:
        bien.valorHistorico !== null && bien.valorHistorico !== undefined
          ? String(bien.valorHistorico)
          : "",
      marca: bien.marca ?? "",
      modelo: bien.modelo ?? "",
      numeroSerie: bien.numeroSerie ?? "",
      numeroMotor: bien.numeroMotor ?? "",
      patente: bien.patente ?? "",
      material: bien.material ?? "",
      medidas: bien.medidas ?? "",
      color: bien.color ?? "",
      situacionInmueble: bien.situacionInmueble ?? "",
      tipoInmueble: bien.tipoInmueble ?? "",
      domicilioInmueble: bien.domicilioInmueble ?? "",
      localidadInmueble: bien.localidadInmueble ?? "",
      provinciaInmueble: bien.provinciaInmueble ?? "",
      codigoPostalInmueble: bien.codigoPostalInmueble ?? "",
      partidaInmobiliaria: bien.partidaInmobiliaria ?? "",
      nomenclaturaCatastral: bien.nomenclaturaCatastral ?? "",
      matriculaInmobiliaria: bien.matriculaInmobiliaria ?? "",
      superficieTerreno:
        bien.superficieTerreno !== null &&
        bien.superficieTerreno !== undefined
          ? String(bien.superficieTerreno)
          : "",
      superficieCubierta:
        bien.superficieCubierta !== null &&
        bien.superficieCubierta !== undefined
          ? String(bien.superficieCubierta)
          : "",
      destinoInmueble: bien.destinoInmueble ?? "",
      fechaEscritura: bien.fechaEscritura
        ? bien.fechaEscritura.slice(0, 10)
        : "",
      numeroEscritura: bien.numeroEscritura ?? "",
      notaria: bien.notaria ?? "",
      observaciones: bien.observaciones ?? "",
    });
  }, [bien, esEdicion, reset]);

  const guardar = useMutation({
    mutationFn: async (values: FormValues) => {
      const {
        codigoInventario,
        modoCodigo: modo,
        ...rest
      } = values;
      const payload: Record<string, unknown> = {
        ...rest,
        organismo: (esEdicion
          ? bien?.organismo ?? values.organismo
          : values.organismo) as Organismo,
        rubroId: Number(values.rubroId),
        estadoId: Number(values.estadoId),
        areaId: values.areaId ? Number(values.areaId) : null,
        subresponsableId: values.subresponsableId
          ? Number(values.subresponsableId)
          : null,
        valorHistorico: values.valorHistorico
          ? Number(values.valorHistorico)
          : null,
        fechaAlta: new Date(`${values.fechaAlta}T12:00:00`).toISOString(),
        marca: mostrar("marca") ? values.marca?.trim() || null : null,
        modelo: mostrar("modelo") ? values.modelo?.trim() || null : null,
        numeroSerie: mostrar("numeroSerie")
          ? values.numeroSerie?.trim() || null
          : null,
        numeroMotor: mostrar("numeroMotor")
          ? values.numeroMotor?.trim() || null
          : null,
        patente: mostrar("patente") ? values.patente?.trim() || null : null,
        material: mostrar("material")
          ? values.material?.trim() || null
          : null,
        medidas: mostrar("medidas") ? values.medidas?.trim() || null : null,
        color: mostrar("color") ? values.color?.trim() || null : null,
        situacionInmueble:
          esInmueble && values.situacionInmueble
            ? (values.situacionInmueble as SituacionInmueble)
            : null,
        tipoInmueble: esInmueble
          ? values.tipoInmueble?.trim() || null
          : null,
        domicilioInmueble: esInmueble
          ? values.domicilioInmueble?.trim() || null
          : null,
        localidadInmueble: esInmueble
          ? values.localidadInmueble?.trim() || null
          : null,
        provinciaInmueble: esInmueble
          ? values.provinciaInmueble?.trim() || null
          : null,
        codigoPostalInmueble: esInmueble
          ? values.codigoPostalInmueble?.trim() || null
          : null,
        partidaInmobiliaria: esInmueble
          ? values.partidaInmobiliaria?.trim() || null
          : null,
        nomenclaturaCatastral: esInmueble
          ? values.nomenclaturaCatastral?.trim() || null
          : null,
        matriculaInmobiliaria: esInmueble
          ? values.matriculaInmobiliaria?.trim() || null
          : null,
        superficieTerreno:
          esInmueble && values.superficieTerreno?.trim()
            ? Number(values.superficieTerreno)
            : null,
        superficieCubierta:
          esInmueble && values.superficieCubierta?.trim()
            ? Number(values.superficieCubierta)
            : null,
        destinoInmueble: esInmueble
          ? values.destinoInmueble?.trim() || null
          : null,
        fechaEscritura:
          esInmueble && values.fechaEscritura
            ? new Date(`${values.fechaEscritura}T12:00:00`).toISOString()
            : null,
        numeroEscritura: esInmueble
          ? values.numeroEscritura?.trim() || null
          : null,
        notaria: esInmueble ? values.notaria?.trim() || null : null,
        observaciones: values.observaciones?.trim() || null,
      };
      delete payload.familia;

      if (esEdicion) {
        return (await api.patch(`/bienes/${id}`, payload)).data as Bien;
      }

      return (
        await api.post("/bienes", {
          ...payload,
          modoCodigo: modo,
          ...(modo === "MANUAL"
            ? { codigoInventario: codigoInventario?.trim() }
            : {}),
        })
      ).data as Bien;
    },
    onSuccess: async (data) => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["bienes"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["bien", id] });

      const Swal = (await import("sweetalert2")).default;
      await Swal.fire({
        icon: "success",
        title: esEdicion ? "Bien actualizado" : "Bien creado",
        text: `Código ${data.codigoInventario}`,
        confirmButtonColor: "#0f4c3a",
        timer: 1600,
        showConfirmButton: false,
      });

      navigate(`/bienes/${data.id}`);
    },
    onError: (err) => {
      setError("");
      void alertaError(err);
    },
  });

  if (esEdicion && cargandoBien) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  const organismoBloqueado = esEdicion && Boolean(bien?.organismo);
  const ayudaCodigo = esEdicion
    ? "El código no se puede modificar."
    : modoCodigo === "AUTO"
      ? !organismo
        ? "Seleccioná el organismo para generar el código."
        : !rubroId
          ? "Seleccioná el rubro para generar el código."
          : errorCodigo
            ? mensajeError(errorCodigo)
            : generandoCodigo
              ? "Calculando el próximo código..."
              : "Se asignará automáticamente al guardar."
      : "Ingresá el código de un bien histórico o un código manual.";

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(esEdicion ? `/bienes/${id}` : "/bienes")}
        >
          Volver
        </Button>
      </Box>

      <Box>
        <Typography variant="h4">
          {esEdicion ? "Editar bien" : "Nuevo bien registrable"}
        </Typography>
        <Typography color="text.secondary">
          Completá los datos patrimoniales del bien. Los campos se adaptan al
          rubro seleccionado; los campos contables de Etapa 2 quedan reservados.
        </Typography>
      </Box>

      {errorCatalogos && (
        <ErrorCarga
          error={errorCatalogos}
          titulo="No se pudieron cargar los datos del formulario"
        />
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit((values) => guardar.mutate(values))}>
        <Stack spacing={2.5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Identificación
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                {organismoBloqueado ? (
                  <TextField
                    label="Organismo"
                    value={etiquetaOrganismo(bien?.organismo)}
                    helperText="El organismo no se puede modificar."
                    slotProps={{ htmlInput: { readOnly: true } }}
                  />
                ) : (
                  <Controller
                    name="organismo"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        select
                        label="Organismo"
                        {...field}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                        required
                      >
                        <MenuItem value="">Seleccionar...</MenuItem>
                        {ORGANISMOS.map((opcion) => (
                          <MenuItem key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                )}
                <Stack spacing={0.5}>
                  <Controller
                    name="codigoInventario"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Código de inventario"
                        {...field}
                        value={
                          !esEdicion && modoCodigo === "AUTO"
                            ? proximoCodigo?.codigo ?? ""
                            : field.value ?? ""
                        }
                        onChange={(event) => {
                          if (!esEdicion && modoCodigo === "AUTO") return;
                          field.onChange(event);
                        }}
                        error={
                          Boolean(fieldState.error) ||
                          (!esEdicion &&
                            modoCodigo === "AUTO" &&
                            Boolean(errorCodigo))
                        }
                        helperText={
                          fieldState.error?.message ?? ayudaCodigo
                        }
                        required={esEdicion || modoCodigo === "MANUAL"}
                        slotProps={{
                          htmlInput: {
                            readOnly:
                              esEdicion || modoCodigo === "AUTO",
                          },
                        }}
                      />
                    )}
                  />
                  {!esEdicion && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={modoCodigo === "MANUAL"}
                          onChange={(event) => {
                            const manual = event.target.checked;
                            setValue(
                              "modoCodigo",
                              manual ? "MANUAL" : "AUTO",
                              { shouldValidate: true },
                            );
                            if (!manual) {
                              setValue("codigoInventario", "");
                            }
                          }}
                        />
                      }
                      label={
                        modoCodigo === "MANUAL"
                          ? "Código manual"
                          : "Código automático"
                      }
                    />
                  )}
                </Stack>
                <TextField
                  label="Descripción"
                  {...register("descripcion")}
                  error={Boolean(errors.descripcion)}
                  helperText={errors.descripcion?.message}
                  required
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />
                <Controller
                  name="rubroId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      select
                      label="Rubro"
                      {...field}
                      onChange={(event) =>
                        cambiarRubro(event, field.onChange)
                      }
                      error={Boolean(fieldState.error)}
                      helperText={
                        fieldState.error?.message ??
                        (rubroSeleccionado
                          ? `Familia: ${etiquetaFamilia(rubroSeleccionado.familia)}`
                          : undefined)
                      }
                      required
                    >
                      <MenuItem value="">Seleccionar...</MenuItem>
                      {rubros?.map((rubro) => (
                        <MenuItem key={rubro.id} value={String(rubro.id)}>
                          {rubro.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="estadoId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      select
                      label="Estado"
                      {...field}
                      error={Boolean(fieldState.error)}
                      helperText={
                        fieldState.error?.message ??
                        (esInmueble
                          ? "Para inmuebles no se usa En depósito ni Prestado."
                          : undefined)
                      }
                      required
                    >
                      <MenuItem value="">Seleccionar...</MenuItem>
                      {estadosVisibles?.map((estado) => (
                        <MenuItem key={estado.id} value={String(estado.id)}>
                          {estado.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                {mostrar("marca") && (
                  <TextField
                    label="Marca"
                    {...register("marca")}
                    error={Boolean(errors.marca)}
                    helperText={errors.marca?.message}
                    required={requerido("marca")}
                  />
                )}
                {mostrar("modelo") && (
                  <TextField
                    label="Modelo"
                    {...register("modelo")}
                    error={Boolean(errors.modelo)}
                    helperText={errors.modelo?.message}
                    required={requerido("modelo")}
                  />
                )}
                {mostrar("numeroSerie") && (
                  <TextField
                    label="N° de serie"
                    {...register("numeroSerie")}
                    error={Boolean(errors.numeroSerie)}
                    helperText={errors.numeroSerie?.message}
                    required={requerido("numeroSerie")}
                  />
                )}
                {mostrar("numeroMotor") && (
                  <TextField
                    label="N° de motor"
                    {...register("numeroMotor")}
                    error={Boolean(errors.numeroMotor)}
                    helperText={errors.numeroMotor?.message}
                    required={requerido("numeroMotor")}
                  />
                )}
                {mostrar("patente") && (
                  <TextField
                    label="Patente"
                    {...register("patente")}
                    error={Boolean(errors.patente)}
                    helperText={errors.patente?.message}
                    required={requerido("patente")}
                  />
                )}
                {mostrar("material") && (
                  <TextField
                    label="Material"
                    {...register("material")}
                    error={Boolean(errors.material)}
                    helperText={errors.material?.message}
                    required={requerido("material")}
                  />
                )}
                {mostrar("medidas") && (
                  <TextField
                    label="Medidas"
                    {...register("medidas")}
                    error={Boolean(errors.medidas)}
                    helperText={errors.medidas?.message}
                    required={requerido("medidas")}
                  />
                )}
                {mostrar("color") && (
                  <TextField
                    label="Color"
                    {...register("color")}
                    error={Boolean(errors.color)}
                    helperText={errors.color?.message}
                    required={requerido("color")}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {esInmueble && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Datos del inmueble
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: 2,
                  }}
                >
                  <Controller
                    name="situacionInmueble"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        select
                        label="Situación del inmueble"
                        {...field}
                        helperText="Ocupación o tenencia actual."
                      >
                        <MenuItem value="">Sin definir</MenuItem>
                        {SITUACIONES_INMUEBLE.map((opcion) => (
                          <MenuItem key={opcion.value} value={opcion.value}>
                            {opcion.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                  <TextField
                    label="Tipo de inmueble"
                    {...register("tipoInmueble")}
                    helperText="Terreno, edificio, local, vivienda, otro."
                  />
                  <TextField
                    label="Domicilio"
                    {...register("domicilioInmueble")}
                    sx={{ gridColumn: { md: "1 / -1" } }}
                  />
                  <TextField
                    label="Localidad"
                    {...register("localidadInmueble")}
                  />
                  <TextField
                    label="Provincia"
                    {...register("provinciaInmueble")}
                  />
                  <TextField
                    label="Código postal"
                    {...register("codigoPostalInmueble")}
                  />
                  <TextField
                    label="Partida inmobiliaria"
                    {...register("partidaInmobiliaria")}
                  />
                  <TextField
                    label="Nomenclatura catastral"
                    {...register("nomenclaturaCatastral")}
                  />
                  <TextField
                    label="Matrícula"
                    {...register("matriculaInmobiliaria")}
                  />
                  <TextField
                    label="Superficie del terreno (m²)"
                    type="number"
                    {...register("superficieTerreno")}
                    error={Boolean(errors.superficieTerreno)}
                    helperText={errors.superficieTerreno?.message}
                    slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
                  />
                  <TextField
                    label="Superficie cubierta (m²)"
                    type="number"
                    {...register("superficieCubierta")}
                    error={Boolean(errors.superficieCubierta)}
                    helperText={errors.superficieCubierta?.message}
                    slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
                  />
                  <TextField
                    label="Destino"
                    {...register("destinoInmueble")}
                  />
                  <TextField
                    label="Fecha de escritura"
                    type="date"
                    {...register("fechaEscritura")}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label="N° de escritura"
                    {...register("numeroEscritura")}
                  />
                  <TextField
                    label="Notaría"
                    {...register("notaria")}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Incorporación y ubicación
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                  gap: 2,
                }}
              >
                <Controller
                  name="tipoIncorporacion"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      select
                      label="Tipo de incorporación"
                      {...field}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                      required
                    >
                      <MenuItem value="COMPRA">Compra</MenuItem>
                      <MenuItem value="DONACION">Donación</MenuItem>
                      <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                      <MenuItem value="PRESTAMO">Préstamo</MenuItem>
                      <MenuItem value="OTRO">Otro</MenuItem>
                    </TextField>
                  )}
                />
                <TextField
                  label="Fecha de alta"
                  type="date"
                  {...register("fechaAlta")}
                  error={Boolean(errors.fechaAlta)}
                  helperText={errors.fechaAlta?.message}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
                <TextField
                  label="Valor histórico"
                  type="number"
                  {...register("valorHistorico")}
                  slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
                />
                <Controller
                  name="areaId"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Área" {...field}>
                      <MenuItem value="">Sin asignar</MenuItem>
                      {areas?.map((area) => (
                        <MenuItem key={area.id} value={String(area.id)}>
                          {area.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="subresponsableId"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Subresponsable" {...field}>
                      <MenuItem value="">Sin asignar</MenuItem>
                      {personas?.map((persona) => (
                        <MenuItem key={persona.id} value={String(persona.id)}>
                          {persona.apellido}, {persona.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField
                  label="Observaciones"
                  {...register("observaciones")}
                  multiline
                  minRows={3}
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />
              </Box>
            </CardContent>
          </Card>

          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={() => navigate(esEdicion ? `/bienes/${id}` : "/bienes")}
              disabled={guardar.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={
                guardar.isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              disabled={guardar.isPending}
            >
              {guardar.isPending ? "Guardando..." : "Guardar bien"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
