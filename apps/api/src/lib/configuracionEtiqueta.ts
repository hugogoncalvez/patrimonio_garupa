import { z } from "zod";

export const CONFIGURACION_ETIQUETA_DEFAULT = {
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
} as const;

export const configuracionEtiquetaSchema = z
  .object({
    version: z.literal(1).default(1),
    hojaAnchoMm: z.number().min(50).max(1000),
    hojaAltoMm: z.number().min(50).max(1000),
    columnas: z.number().int().min(1).max(20),
    filas: z.number().int().min(1).max(30),
    etiquetaAnchoMm: z.number().min(5).max(500),
    etiquetaAltoMm: z.number().min(5).max(500),
    margenSuperiorMm: z.number().min(0).max(500),
    margenIzquierdoMm: z.number().min(0).max(500),
    separacionXMm: z.number().min(0).max(100),
    separacionYMm: z.number().min(0).max(100),
    ajusteXMm: z.number().min(-50).max(50),
    ajusteYMm: z.number().min(-50).max(50),
    qrTamanoMm: z.number().min(5).max(300),
  })
  .superRefine((data, ctx) => {
    const anchoUsado =
      data.columnas * data.etiquetaAnchoMm +
      (data.columnas - 1) * data.separacionXMm;
    const altoUsado =
      data.filas * data.etiquetaAltoMm +
      (data.filas - 1) * data.separacionYMm;

    if (data.margenIzquierdoMm + anchoUsado > data.hojaAnchoMm) {
      ctx.addIssue({
        code: "custom",
        path: ["columnas"],
        message: "La grilla no entra en el ancho de la hoja",
      });
    }

    if (data.margenSuperiorMm + altoUsado > data.hojaAltoMm) {
      ctx.addIssue({
        code: "custom",
        path: ["filas"],
        message: "La grilla no entra en el alto de la hoja",
      });
    }

    if (data.qrTamanoMm > Math.min(data.etiquetaAnchoMm, data.etiquetaAltoMm)) {
      ctx.addIssue({
        code: "custom",
        path: ["qrTamanoMm"],
        message: "El QR no puede ser más grande que la etiqueta",
      });
    }
  });

export type ConfiguracionEtiqueta = z.infer<typeof configuracionEtiquetaSchema>;
