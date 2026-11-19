import type { ConfiguracionEtiqueta } from "../types";

export interface EtiquetaImprimible {
  id: number | string;
  codigo: string;
  descripcion: string;
  marca?: string | null;
  modelo?: string | null;
  patente?: string | null;
}

export interface PresetEtiqueta {
  id: string;
  nombre: string;
  configuracion: ConfiguracionEtiqueta;
}

export const CONFIGURACION_ETIQUETA_DEFAULT: ConfiguracionEtiqueta = {
  version: 1,
  hojaAnchoMm: 210,
  hojaAltoMm: 297,
  columnas: 3,
  filas: 7,
  etiquetaAnchoMm: 70,
  etiquetaAltoMm: 37,
  margenSuperiorMm: 19,
  margenIzquierdoMm: 0,
  separacionXMm: 0,
  separacionYMm: 0,
  ajusteXMm: 0,
  ajusteYMm: 0,
  qrTamanoMm: 25,
};

export const PRESETS_ETIQUETA: PresetEtiqueta[] = [
  {
    id: "a4-3x7-70x37",
    nombre: "A4 3×7 · etiqueta 70 × 37 mm",
    configuracion: {
      ...CONFIGURACION_ETIQUETA_DEFAULT,
      columnas: 3,
      filas: 7,
      etiquetaAnchoMm: 70,
      etiquetaAltoMm: 37,
      margenSuperiorMm: 19,
      margenIzquierdoMm: 0,
      qrTamanoMm: 25,
    },
  },
  {
    id: "a4-3x8-70x37",
    nombre: "A4 3×8 · etiqueta 70 × 37 mm",
    configuracion: {
      ...CONFIGURACION_ETIQUETA_DEFAULT,
      columnas: 3,
      filas: 8,
      etiquetaAnchoMm: 70,
      etiquetaAltoMm: 37,
      margenSuperiorMm: 0.5,
      margenIzquierdoMm: 0,
      qrTamanoMm: 25,
    },
  },
  {
    id: "a4-2x7-99x38",
    nombre: "A4 2×7 · etiqueta 99,1 × 38,1 mm",
    configuracion: {
      ...CONFIGURACION_ETIQUETA_DEFAULT,
      columnas: 2,
      filas: 7,
      etiquetaAnchoMm: 99.1,
      etiquetaAltoMm: 38.1,
      margenSuperiorMm: 15.15,
      margenIzquierdoMm: 5.9,
      qrTamanoMm: 26,
    },
  },
  {
    id: "a4-2x5-105x57",
    nombre: "A4 2×5 · etiqueta 105 × 57 mm",
    configuracion: {
      ...CONFIGURACION_ETIQUETA_DEFAULT,
      columnas: 2,
      filas: 5,
      etiquetaAnchoMm: 105,
      etiquetaAltoMm: 57,
      margenSuperiorMm: 6,
      margenIzquierdoMm: 0,
      qrTamanoMm: 32,
    },
  },
];

export function validarConfiguracionEtiqueta(
  configuracion: ConfiguracionEtiqueta,
): string[] {
  const errores: string[] = [];

  if (configuracion.hojaAnchoMm <= 0 || configuracion.hojaAltoMm <= 0) {
    errores.push("Las medidas de la hoja deben ser mayores a cero");
  }

  if (configuracion.columnas < 1 || configuracion.filas < 1) {
    errores.push("La hoja debe tener al menos una fila y una columna");
  }

  if (configuracion.etiquetaAnchoMm <= 0 || configuracion.etiquetaAltoMm <= 0) {
    errores.push("Las medidas de la etiqueta deben ser mayores a cero");
  }

  const anchoUsado =
    configuracion.columnas * configuracion.etiquetaAnchoMm +
    (configuracion.columnas - 1) * configuracion.separacionXMm;
  const altoUsado =
    configuracion.filas * configuracion.etiquetaAltoMm +
    (configuracion.filas - 1) * configuracion.separacionYMm;

  if (configuracion.margenIzquierdoMm + anchoUsado > configuracion.hojaAnchoMm) {
    errores.push("La grilla no entra en el ancho de la hoja");
  }

  if (configuracion.margenSuperiorMm + altoUsado > configuracion.hojaAltoMm) {
    errores.push("La grilla no entra en el alto de la hoja");
  }

  if (
    configuracion.qrTamanoMm >
    Math.min(configuracion.etiquetaAnchoMm, configuracion.etiquetaAltoMm)
  ) {
    errores.push("El QR no puede ser más grande que la etiqueta");
  }

  return errores;
}

export function totalCeldas(configuracion: ConfiguracionEtiqueta) {
  return configuracion.columnas * configuracion.filas;
}

export function posicionCelda(
  configuracion: ConfiguracionEtiqueta,
  celda: number,
) {
  const indice = Math.max(0, celda - 1);
  const columna = indice % configuracion.columnas;
  const fila = Math.floor(indice / configuracion.columnas);

  return {
    x:
      configuracion.margenIzquierdoMm +
      configuracion.ajusteXMm +
      columna *
        (configuracion.etiquetaAnchoMm + configuracion.separacionXMm),
    y:
      configuracion.margenSuperiorMm +
      configuracion.ajusteYMm +
      fila * (configuracion.etiquetaAltoMm + configuracion.separacionYMm),
  };
}

export function configuracionCoincideConPreset(
  configuracion: ConfiguracionEtiqueta,
) {
  const preset = PRESETS_ETIQUETA.find((item) => {
    const base = item.configuracion;
    return (
      base.hojaAnchoMm === configuracion.hojaAnchoMm &&
      base.hojaAltoMm === configuracion.hojaAltoMm &&
      base.columnas === configuracion.columnas &&
      base.filas === configuracion.filas &&
      base.etiquetaAnchoMm === configuracion.etiquetaAnchoMm &&
      base.etiquetaAltoMm === configuracion.etiquetaAltoMm &&
      base.margenSuperiorMm === configuracion.margenSuperiorMm &&
      base.margenIzquierdoMm === configuracion.margenIzquierdoMm &&
      base.separacionXMm === configuracion.separacionXMm &&
      base.separacionYMm === configuracion.separacionYMm &&
      base.qrTamanoMm === configuracion.qrTamanoMm
    );
  });

  return preset?.id ?? "personalizada";
}

function normalizarAscii(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function construirContenidoQr(etiqueta: EtiquetaImprimible) {
  const lineas = [
    `Codigo: ${normalizarAscii(etiqueta.codigo)}`,
    `Descripcion: ${normalizarAscii(etiqueta.descripcion)}`,
    etiqueta.marca?.trim()
      ? `Marca: ${normalizarAscii(etiqueta.marca)}`
      : null,
    etiqueta.modelo?.trim()
      ? `Modelo: ${normalizarAscii(etiqueta.modelo)}`
      : null,
    etiqueta.patente?.trim()
      ? `Dominio: ${normalizarAscii(etiqueta.patente)}`
      : null,
  ].filter((linea): linea is string => Boolean(linea));

  return lineas.join("\n");
}
