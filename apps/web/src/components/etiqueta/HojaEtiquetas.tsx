import { createPortal } from "react-dom";
import { Box, GlobalStyles, Typography } from "@mui/material";
import {
  posicionCelda,
  totalCeldas,
  type EtiquetaImprimible,
} from "../../lib/etiqueta";
import type { ConfiguracionEtiqueta } from "../../types";
import { ContenidoEtiqueta } from "./ContenidoEtiqueta";

interface HojaEtiquetasProps {
  etiquetas: EtiquetaImprimible[];
  configuracion: ConfiguracionEtiqueta;
  celdaInicio?: number;
  calibracion?: boolean;
}

interface EtiquetaEnCelda {
  etiqueta: EtiquetaImprimible;
  celda: number;
}

function construirPaginas(
  etiquetas: EtiquetaImprimible[],
  configuracion: ConfiguracionEtiqueta,
  celdaInicio: number,
) {
  const total = totalCeldas(configuracion);

  if (!etiquetas.length || total < 1) {
    return [[]] as EtiquetaEnCelda[][];
  }

  const paginas: EtiquetaEnCelda[][] = [];
  let indice = 0;
  let celda = Math.min(Math.max(1, celdaInicio), total);

  while (indice < etiquetas.length) {
    const pagina: EtiquetaEnCelda[] = [];

    while (celda <= total && indice < etiquetas.length) {
      pagina.push({ etiqueta: etiquetas[indice], celda });
      indice += 1;
      celda += 1;
    }

    paginas.push(pagina);
    celda = 1;
  }

  return paginas;
}

export function HojaEtiquetas({
  etiquetas,
  configuracion,
  celdaInicio = 1,
  calibracion = false,
}: HojaEtiquetasProps) {
  if (typeof document === "undefined") {
    return null;
  }

  const paginas = calibracion
    ? [[] as EtiquetaEnCelda[]]
    : construirPaginas(etiquetas, configuracion, celdaInicio);
  const celdas = totalCeldas(configuracion);

  const contenido = (
    <Box
      className="hoja-etiquetas-print"
      aria-hidden
      sx={{ display: "none" }}
    >
      {paginas.map((pagina, indicePagina) => (
        <Box
          key={indicePagina}
          className="hoja-etiqueta-pagina"
          sx={{
            position: "relative",
            width: `${configuracion.hojaAnchoMm}mm`,
            height: `${configuracion.hojaAltoMm}mm`,
            overflow: "hidden",
            bgcolor: "#fff",
            color: "#000",
            breakAfter:
              indicePagina === paginas.length - 1 ? "auto" : "page",
            pageBreakAfter:
              indicePagina === paginas.length - 1 ? "auto" : "always",
          }}
        >
          {calibracion &&
            Array.from({ length: celdas }, (_, indice) => {
              const celda = indice + 1;
              const posicion = posicionCelda(configuracion, celda);

              return (
                <Box
                  key={celda}
                  sx={{
                    position: "absolute",
                    left: `${posicion.x}mm`,
                    top: `${posicion.y}mm`,
                    width: `${configuracion.etiquetaAnchoMm}mm`,
                    height: `${configuracion.etiquetaAltoMm}mm`,
                    boxSizing: "border-box",
                    border: "0.2mm dashed #888",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Typography sx={{ fontSize: "4mm", color: "#666" }}>
                    {celda}
                  </Typography>
                </Box>
              );
            })}

          {!calibracion &&
            pagina.map(({ etiqueta, celda }) => {
              const posicion = posicionCelda(configuracion, celda);

              return (
                <Box
                  key={`${indicePagina}-${celda}-${etiqueta.id}`}
                  sx={{
                    position: "absolute",
                    left: `${posicion.x}mm`,
                    top: `${posicion.y}mm`,
                    width: `${configuracion.etiquetaAnchoMm}mm`,
                    height: `${configuracion.etiquetaAltoMm}mm`,
                    overflow: "hidden",
                  }}
                >
                  <ContenidoEtiqueta
                    etiqueta={etiqueta}
                    configuracion={configuracion}
                  />
                </Box>
              );
            })}
        </Box>
      ))}
    </Box>
  );

  return createPortal(
    <>
      <GlobalStyles
        styles={{
          "@page": {
            size: `${configuracion.hojaAnchoMm}mm ${configuracion.hojaAltoMm}mm`,
            margin: 0,
          },
          "@media print": {
            "html, body": {
              margin: "0 !important",
              padding: "0 !important",
              background: "#fff !important",
              height: "auto !important",
              minHeight: "0 !important",
              overflow: "visible !important",
            },
            "body > *:not(.hoja-etiquetas-print)": {
              display: "none !important",
            },
            ".hoja-etiquetas-print": {
              display: "block !important",
            },
            ".hoja-etiqueta-pagina": {
              printColorAdjust: "exact",
              WebkitPrintColorAdjust: "exact",
            },
          },
        }}
      />
      {contenido}
    </>,
    document.body,
  );
}
