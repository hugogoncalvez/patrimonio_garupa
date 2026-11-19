import { Box, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import {
  construirContenidoQr,
  type EtiquetaImprimible,
} from "../../lib/etiqueta";
import type { ConfiguracionEtiqueta } from "../../types";

interface ContenidoEtiquetaProps {
  etiqueta: EtiquetaImprimible;
  configuracion: ConfiguracionEtiqueta;
}

export function ContenidoEtiqueta({
  etiqueta,
  configuracion,
}: ContenidoEtiquetaProps) {
  const padding = Math.min(
    3,
    Math.max(1.2, Math.min(configuracion.etiquetaAnchoMm, configuracion.etiquetaAltoMm) * 0.06),
  );
  const separacion = Math.min(3, configuracion.etiquetaAnchoMm * 0.04);
  const qr = Math.max(
    6,
    Math.min(
      configuracion.qrTamanoMm,
      configuracion.etiquetaAltoMm - padding * 2,
      configuracion.etiquetaAnchoMm * 0.55,
    ),
  );
  const base = Math.max(
    1.8,
    Math.min(3.4, configuracion.etiquetaAltoMm / 12),
  );
  const lineasDescripcion = Math.max(
    1,
    Math.min(4, Math.floor(configuracion.etiquetaAltoMm / 12)),
  );
  const qrPx = Math.max(64, Math.round((qr * 96) / 25.4));

  return (
    <Box
      sx={{
        width: `${configuracion.etiquetaAnchoMm}mm`,
        height: `${configuracion.etiquetaAltoMm}mm`,
        p: `${padding}mm`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: `${separacion}mm`,
        bgcolor: "#fff",
        color: "#000",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: `${qr}mm`,
          height: `${qr}mm`,
          flexShrink: 0,
          lineHeight: 0,
          "& svg": { width: "100%", height: "100%" },
        }}
      >
        <QRCodeSVG
          value={construirContenidoQr(etiqueta)}
          size={qrPx}
          level="M"
          fgColor="#000000"
          bgColor="#ffffff"
        />
      </Box>

      <Box
        sx={{
          minWidth: 0,
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            fontSize: `${base * 0.62}mm`,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "0.02em",
          }}
        >
          MUNICIPALIDAD DE GARUPÁ
        </Typography>
        <Typography
          sx={{
            mt: `${padding * 0.25}mm`,
            fontSize: `${base}mm`,
            fontWeight: 700,
            lineHeight: 1.12,
            overflowWrap: "anywhere",
          }}
        >
          {etiqueta.codigo}
        </Typography>
        <Typography
          sx={{
            mt: `${padding * 0.25}mm`,
            fontSize: `${base * 0.82}mm`,
            lineHeight: 1.18,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: lineasDescripcion,
            overflow: "hidden",
          }}
        >
          {etiqueta.descripcion}
        </Typography>
        <Typography
          sx={{
            mt: `${padding * 0.35}mm`,
            fontSize: `${base * 0.58}mm`,
            lineHeight: 1,
          }}
        >
          Patrimonio municipal
        </Typography>
      </Box>
    </Box>
  );
}
