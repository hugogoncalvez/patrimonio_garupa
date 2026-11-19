import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import SettingsIcon from "@mui/icons-material/Settings";
import { api } from "../lib/api";
import { alertaError } from "../lib/errors";
import {
  CONFIGURACION_ETIQUETA_DEFAULT,
  type EtiquetaImprimible,
} from "../lib/etiqueta";
import type { ConfiguracionEtiqueta } from "../types";
import { ConfiguracionEtiquetaDialog } from "./etiqueta/ConfiguracionEtiquetaDialog";
import { ContenidoEtiqueta } from "./etiqueta/ContenidoEtiqueta";
import { HojaEtiquetas } from "./etiqueta/HojaEtiquetas";
import { ImprimirEtiquetaDialog } from "./etiqueta/ImprimirEtiquetaDialog";

type ModoImpresion = "etiqueta" | "calibracion";

export function EtiquetaQr({
  codigo,
  descripcion,
  marca,
  modelo,
  patente,
}: {
  codigo: string;
  descripcion: string;
  marca?: string | null;
  modelo?: string | null;
  patente?: string | null;
}) {
  const queryClient = useQueryClient();
  const [configuracionAbierta, setConfiguracionAbierta] = useState(false);
  const [impresionAbierta, setImpresionAbierta] = useState(false);
  const [celda, setCelda] = useState(1);
  const [modoImpresion, setModoImpresion] = useState<ModoImpresion | null>(
    null,
  );

  const {
    data: configuracionGuardada,
    isLoading: cargandoConfiguracion,
  } = useQuery<ConfiguracionEtiqueta>({
    queryKey: ["configuracion-etiqueta"],
    queryFn: async () => (await api.get("/preferencias/etiqueta")).data,
    staleTime: 0,
  });

  const configuracion =
    configuracionGuardada ?? CONFIGURACION_ETIQUETA_DEFAULT;

  const etiqueta: EtiquetaImprimible = {
    id: codigo,
    codigo,
    descripcion,
    marca,
    modelo,
    patente,
  };

  const guardarConfiguracion = useMutation({
    mutationFn: async (data: ConfiguracionEtiqueta) =>
      (await api.put<ConfiguracionEtiqueta>("/preferencias/etiqueta", data))
        .data,
    onSuccess: (data) => {
      queryClient.setQueryData(["configuracion-etiqueta"], data);
      setConfiguracionAbierta(false);
    },
    onError: alertaError,
  });

  useEffect(() => {
    if (!modoImpresion) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
      setModoImpresion(null);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [modoImpresion]);

  const abrirImpresion = () => {
    setImpresionAbierta(true);
  };

  const imprimir = (modo: ModoImpresion) => {
    setImpresionAbierta(false);
    setConfiguracionAbierta(false);
    setModoImpresion(modo);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Etiqueta QR
        </Typography>

        <Box
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "white",
            color: "black",
            display: "flex",
            justifyContent: "center",
            overflowX: "auto",
          }}
        >
          <ContenidoEtiqueta
            etiqueta={etiqueta}
            configuracion={configuracion}
          />
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 2 }}
        >
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={abrirImpresion}
            disabled={cargandoConfiguracion}
          >
            Imprimir etiqueta
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setConfiguracionAbierta(true)}
            disabled={cargandoConfiguracion}
          >
            Configurar etiqueta
          </Button>
        </Stack>
      </CardContent>

      <ConfiguracionEtiquetaDialog
        open={configuracionAbierta}
        configuracion={configuracion}
        celda={celda}
        guardando={guardarConfiguracion.isPending}
        onCeldaChange={setCelda}
        onClose={() => setConfiguracionAbierta(false)}
        onSave={(data) => guardarConfiguracion.mutate(data)}
      />

      <ImprimirEtiquetaDialog
        open={impresionAbierta}
        configuracion={configuracion}
        celda={celda}
        onCeldaChange={setCelda}
        onClose={() => setImpresionAbierta(false)}
        onConfigurar={() => {
          setImpresionAbierta(false);
          setConfiguracionAbierta(true);
        }}
        onImprimir={() => imprimir("etiqueta")}
        onCalibrar={() => imprimir("calibracion")}
      />

      {modoImpresion && (
        <HojaEtiquetas
          etiquetas={modoImpresion === "etiqueta" ? [etiqueta] : []}
          configuracion={configuracion}
          celdaInicio={celda}
          calibracion={modoImpresion === "calibracion"}
        />
      )}
    </Card>
  );
}
