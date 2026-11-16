import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
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
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import CancelIcon from "@mui/icons-material/Cancel";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorCarga } from "../components/ErrorCarga";
import { alertaError, alertaExito } from "../lib/errors";
import { formatoFecha, formatoFechaHora, formatoNumero } from "../lib/format";
import { useAuth } from "../auth/AuthContext";
import type { EntregaConsumible } from "../types";

export function EntregaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const [searchParams] = useSearchParams();
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const esNueva = searchParams.get("nueva") === "1";

  const { data: entrega, isLoading, error, refetch } = useQuery<EntregaConsumible>({
    queryKey: ["entrega", id],
    queryFn: async () =>
      (await api.get(`/entregas-consumibles/${id}`)).data,
    enabled: Boolean(id),
  });

  const anular = useMutation({
    mutationFn: async (motivo: string) =>
      (
        await api.post(`/entregas-consumibles/${id}/anular`, {
          motivo,
        })
      ).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entrega", id] }),
        queryClient.invalidateQueries({ queryKey: ["entregas"] }),
        queryClient.invalidateQueries({ queryKey: ["consumibles"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      await alertaExito("Entrega anulada");
    },
    onError: alertaError,
  });

  const pedirAnulacion = async () => {
    const Swal = (await import("sweetalert2")).default;
    const { value } = await Swal.fire({
      title: "Anular entrega",
      text: "Se devolverá el stock de todos los consumibles. Indicá el motivo.",
      input: "textarea",
      inputPlaceholder: "Motivo de anulación",
      showCancelButton: true,
      confirmButtonText: "Anular",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#c62828",
      inputValidator: (value) =>
        (value?.trim().length ?? 0) >= 5
          ? undefined
          : "Ingresá un motivo de al menos 5 caracteres",
    });

    if (value) anular.mutate(value.trim());
  };

  const obtenerPdf = async (descargar: boolean) => {
    if (!entrega) return;
    setGenerandoPdf(true);
    const ventana = descargar ? null : window.open("", "_blank");

    try {
      const response = await api.get(
        `/entregas-consumibles/${entrega.id}/acta.pdf`,
        {
          params: descargar ? { descargar: "1" } : undefined,
          responseType: "blob",
        },
      );

      const url = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );

      if (descargar) {
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `${entrega.numero}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      } else if (ventana) {
        ventana.location.href = url;
      } else {
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      }

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      ventana?.close();
      await alertaError(error);
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (isLoading) {
    return <Typography color="text.secondary">Cargando entrega...</Typography>;
  }

  if (error) {
    return (
      <ErrorCarga
        error={error}
        onRetry={() => void refetch()}
        titulo="No se pudo cargar la entrega"
      />
    );
  }

  if (!entrega) {
    return <Alert severity="error">Entrega no encontrada.</Alert>;
  }

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          gap: 2,
          alignItems: { md: "center" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={() => navigate("/entregas")} title="Volver">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h4">{entrega.numero}</Typography>
              <Chip
                size="small"
                label={entrega.estado === "ANULADA" ? "Anulada" : "Registrada"}
                color={entrega.estado === "ANULADA" ? "error" : "success"}
              />
            </Box>
            <Typography color="text.secondary">
              Acta de entrega de consumibles · {formatoFecha(entrega.fecha)}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => obtenerPdf(false)}
            disabled={generandoPdf}
          >
            Ver / Imprimir acta
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => obtenerPdf(true)}
            disabled={generandoPdf}
          >
            Descargar PDF
          </Button>
        </Stack>
      </Box>

      {esNueva ? (
        <Alert severity="success">
          Entrega registrada. Ya podés imprimir o descargar el acta.
        </Alert>
      ) : null}

      {entrega.estado === "ANULADA" ? (
        <Alert severity="warning">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Entrega anulada
          </Typography>
          <Typography variant="body2">
            {entrega.motivoAnulacion ?? "Sin motivo registrado"} ·{" "}
            {formatoFechaHora(entrega.fechaAnulacion)}
            {entrega.anuladaPor
              ? ` · ${entrega.anuladaPor.nombre} ${entrega.anuladaPor.apellido}`
              : ""}
          </Typography>
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Datos del acta
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 1.5,
            }}
          >
            <Dato etiqueta="Área destino" valor={entrega.areaNombreSnapshot} />
            <Dato
              etiqueta="Responsable del área"
              valor={entrega.responsableNombreSnapshot ?? "Sin responsable"}
            />
            <Dato etiqueta="Firmante" valor={entrega.firmanteNombre} />
            <Dato etiqueta="DNI" valor={entrega.firmanteDni} />
            <Dato
              etiqueta="Registrado por"
              valor={entrega.usuarioNombreSnapshot ?? "-"}
            />
            <Dato
              etiqueta="Fecha de registro"
              valor={formatoFechaHora(entrega.createdAt)}
            />
          </Box>

          {entrega.observaciones ? (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Observaciones
              </Typography>
              <Typography variant="body2">{entrega.observaciones}</Typography>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Consumibles entregados</Typography>
            <Typography variant="body2" color="text.secondary">
              {entrega.movimientos.length}{" "}
              {entrega.movimientos.length === 1 ? "línea" : "líneas"}
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Consumible</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entrega.movimientos.map((movimiento, indice) => (
                  <TableRow key={movimiento.id}>
                    <TableCell>{indice + 1}</TableCell>
                    <TableCell>
                      {movimiento.nombreConsumibleSnapshot ??
                        movimiento.consumible?.nombre ??
                        "-"}
                    </TableCell>
                    <TableCell>
                      {movimiento.unidadMedidaSnapshot ??
                        movimiento.consumible?.unidadMedida ??
                        "-"}
                    </TableCell>
                    <TableCell align="right">
                      {formatoNumero(movimiento.cantidad)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {usuario?.rol === "CONTABLE" && entrega.estado === "REGISTRADA" ? (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  color="error"
                  startIcon={
                    anular.isPending ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <CancelIcon />
                    )
                  }
                  onClick={pedirAnulacion}
                  disabled={anular.isPending}
                >
                  {anular.isPending ? "Anulando..." : "Anular entrega"}
                </Button>
              </Box>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {etiqueta}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {valor}
      </Typography>
    </Box>
  );
}
