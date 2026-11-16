import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError } from "../lib/errors";
import { hoyISO } from "../lib/format";
import type { Area, Bien, EstadoBien, Persona, Rubro } from "../types";

const schema = z.object({
  codigoInventario: z.string().trim().min(1, "El código es obligatorio").max(40),
  numeroIdentificacion: z
    .string()
    .trim()
    .min(1, "El número de identificación es obligatorio")
    .max(40),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria").max(300),
  rubroId: z.string().min(1, "Seleccioná un rubro"),
  estadoId: z.string().min(1, "Seleccioná un estado"),
  areaId: z.string().optional(),
  subresponsableId: z.string().optional(),
  tipoIncorporacion: z.enum([
    "COMPRA",
    "DONACION",
    "TRANSFERENCIA",
    "PRESTAMO",
    "OTRO",
  ]),
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
  observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const valoresIniciales: FormValues = {
  codigoInventario: "",
  numeroIdentificacion: "",
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
  observaciones: "",
};

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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresIniciales,
  });

  useEffect(() => {
    if (!bien) return;

    reset({
      codigoInventario: bien.codigoInventario,
      numeroIdentificacion: bien.numeroIdentificacion,
      descripcion: bien.descripcion,
      rubroId: String(bien.rubroId),
      estadoId: String(bien.estadoId),
      areaId: bien.areaId ? String(bien.areaId) : "",
      subresponsableId: bien.subresponsableId
        ? String(bien.subresponsableId)
        : "",
      tipoIncorporacion: bien.tipoIncorporacion as FormValues["tipoIncorporacion"],
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
      observaciones: bien.observaciones ?? "",
    });
  }, [bien, reset]);

  const guardar = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
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
        marca: values.marca?.trim() || null,
        modelo: values.modelo?.trim() || null,
        numeroSerie: values.numeroSerie?.trim() || null,
        numeroMotor: values.numeroMotor?.trim() || null,
        patente: values.patente?.trim() || null,
        material: values.material?.trim() || null,
        medidas: values.medidas?.trim() || null,
        color: values.color?.trim() || null,
        observaciones: values.observaciones?.trim() || null,
      };

      if (esEdicion) {
        return (await api.patch(`/bienes/${id}`, payload)).data as Bien;
      }

      return (await api.post("/bienes", payload)).data as Bien;
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
          Completá los datos patrimoniales del bien. Los campos contables de
          Etapa 2 quedan reservados.
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
                <TextField
                  label="Código de inventario"
                  {...register("codigoInventario")}
                  error={Boolean(errors.codigoInventario)}
                  helperText={errors.codigoInventario?.message}
                  required
                />
                <TextField
                  label="N° de identificación"
                  {...register("numeroIdentificacion")}
                  error={Boolean(errors.numeroIdentificacion)}
                  helperText={errors.numeroIdentificacion?.message}
                  required
                />
                <TextField
                  label="Descripción"
                  {...register("descripcion")}
                  error={Boolean(errors.descripcion)}
                  helperText={errors.descripcion?.message}
                  required
                  sx={{ gridColumn: { md: "1 / -1" } }}
                />
                <TextField
                  select
                  label="Rubro"
                  {...register("rubroId")}
                  error={Boolean(errors.rubroId)}
                  helperText={errors.rubroId?.message}
                  required
                >
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {rubros?.map((rubro) => (
                    <MenuItem key={rubro.id} value={String(rubro.id)}>
                      {rubro.nombre}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Estado"
                  {...register("estadoId")}
                  error={Boolean(errors.estadoId)}
                  helperText={errors.estadoId?.message}
                  required
                >
                  <MenuItem value="">Seleccionar...</MenuItem>
                  {estados?.map((estado) => (
                    <MenuItem key={estado.id} value={String(estado.id)}>
                      {estado.nombre}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Marca"
                  {...register("marca")}
                />
                <TextField
                  label="Modelo"
                  {...register("modelo")}
                />
                <TextField
                  label="N° de serie"
                  {...register("numeroSerie")}
                />
                <TextField
                  label="N° de motor"
                  {...register("numeroMotor")}
                />
                <TextField
                  label="Patente"
                  {...register("patente")}
                />
                <TextField
                  label="Material"
                  {...register("material")}
                />
                <TextField
                  label="Medidas"
                  {...register("medidas")}
                />
                <TextField
                  label="Color"
                  {...register("color")}
                />
              </Box>
            </CardContent>
          </Card>

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
                <TextField
                  select
                  label="Tipo de incorporación"
                  {...register("tipoIncorporacion")}
                >
                  <MenuItem value="COMPRA">Compra</MenuItem>
                  <MenuItem value="DONACION">Donación</MenuItem>
                  <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                  <MenuItem value="PRESTAMO">Préstamo</MenuItem>
                  <MenuItem value="OTRO">Otro</MenuItem>
                </TextField>
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
                <TextField
                  select
                  label="Área"
                  {...register("areaId")}
                >
                  <MenuItem value="">Sin asignar</MenuItem>
                  {areas?.map((area) => (
                    <MenuItem key={area.id} value={String(area.id)}>
                      {area.nombre}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Subresponsable"
                  {...register("subresponsableId")}
                >
                  <MenuItem value="">Sin asignar</MenuItem>
                  {personas?.map((persona) => (
                    <MenuItem key={persona.id} value={String(persona.id)}>
                      {persona.apellido}, {persona.nombre}
                    </MenuItem>
                  ))}
                </TextField>
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
