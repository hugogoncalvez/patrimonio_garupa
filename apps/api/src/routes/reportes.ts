import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { registrarAuditoria } from "../lib/audit.js";
import {
  generarReportePdf,
  type FiltroReporte,
  type SeccionReporte,
} from "../lib/reporte-pdf.js";
import {
  LIMITE_REPORTE,
  obtenerBienesPorArea,
  obtenerBienesPorResponsable,
  obtenerComprasPeriodo,
  obtenerConsumiblesStock,
  obtenerMovimientosStock,
} from "../lib/reportes.js";

export const reportesRouter = Router();

reportesRouter.use(requireAuth);

const fechaOpcional = z.preprocess(
  (valor) => (valor === "" || valor === null || valor === undefined ? undefined : valor),
  z.coerce.date().optional(),
);

const rangoFechas = {
  desde: fechaOpcional,
  hasta: fechaOpcional,
};

const bienesQuery = z.object({
  areaId: z.coerce.number().int().positive().optional(),
  responsableId: z.coerce.number().int().positive().optional(),
});

const consumiblesQuery = z.object({
  q: z.preprocess(
    (valor) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined),
    z.string().max(120).optional(),
  ),
  categoriaId: z.coerce.number().int().positive().optional(),
  soloStockBajo: z.enum(["true", "false"]).optional(),
});

const movimientosQuery = z.object({
  ...rangoFechas,
  areaId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(["INGRESO", "ENTREGA", "AJUSTE"]).optional(),
});

const comprasQuery = z.object({
  ...rangoFechas,
  areaId: z.coerce.number().int().positive().optional(),
  organismo: z.enum(["DE", "HCD"]).optional(),
  estado: z.enum(["REGISTRADA", "RECIBIDA_PARCIAL", "RECIBIDA"]).optional(),
});

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 3,
});

const tipoMovimiento: Record<string, string> = {
  INGRESO: "Ingreso",
  ENTREGA: "Entrega",
  AJUSTE: "Ajuste",
};

const estadoCompra: Record<string, string> = {
  REGISTRADA: "Pendiente",
  RECIBIDA_PARCIAL: "Parcial",
  RECIBIDA: "Recibida",
};

function fechaCorta(value: Date | string) {
  return formatoFecha.format(new Date(value));
}

function fechaHora(value: Date | string) {
  return formatoFechaHora.format(new Date(value)).replace(",", "");
}

function numero(value: unknown) {
  const convertido = Number(value);
  if (!Number.isFinite(convertido)) return "0";
  return formatoNumero.format(convertido);
}

function moneda(value: unknown) {
  const convertido = Number(value);
  if (!Number.isFinite(convertido)) return "$ 0,00";
  return formatoMoneda.format(convertido).replace(/\u00a0/g, " ");
}

function nombrePersona(
  persona: { nombre: string; apellido: string } | null | undefined,
) {
  return persona ? `${persona.apellido}, ${persona.nombre}` : "-";
}

function totalCompra(compra: {
  detalles: { cantidad: unknown; precioUnitario?: unknown }[];
}) {
  return compra.detalles.reduce(
    (total, detalle) =>
      total + Number(detalle.cantidad) * Number(detalle.precioUnitario ?? 0),
    0,
  );
}

function notaTruncado(total: number, mostrados: number) {
  if (total <= mostrados) return undefined;
  return `Se listan los primeros ${numero(mostrados)} registros de ${numero(total)}. Ajustá los filtros para acotar el resultado.`;
}

function buscarArea(id?: number) {
  return id
    ? prisma.area.findUnique({ where: { id }, select: { nombre: true } })
    : Promise.resolve(null);
}

function buscarPersona(id?: number) {
  return id
    ? prisma.persona.findUnique({
        where: { id },
        select: { nombre: true, apellido: true },
      })
    : Promise.resolve(null);
}

function buscarCategoria(id?: number) {
  return id
    ? prisma.categoriaConsumible.findUnique({
        where: { id },
        select: { nombre: true },
      })
    : Promise.resolve(null);
}

function etiquetasBienes(
  filtros: z.infer<typeof bienesQuery>,
  area: { nombre: string } | null,
  responsable: { nombre: string; apellido: string } | null,
) {
  const resultado: FiltroReporte[] = [];

  if (filtros.areaId) {
    resultado.push({
      etiqueta: "Área",
      valor: area?.nombre ?? `Área #${filtros.areaId}`,
    });
  }
  if (filtros.responsableId) {
    resultado.push({
      etiqueta: "Responsable",
      valor: responsable
        ? nombrePersona(responsable)
        : `Responsable #${filtros.responsableId}`,
    });
  }

  return resultado;
}

function etiquetasPeriodo(desde?: Date, hasta?: Date) {
  const resultado: FiltroReporte[] = [];
  if (desde) resultado.push({ etiqueta: "Desde", valor: fechaCorta(desde) });
  if (hasta) resultado.push({ etiqueta: "Hasta", valor: fechaCorta(hasta) });
  return resultado;
}

async function enviarPdf(
  req: Request,
  res: Response,
  tipo: string,
  filtros: FiltroReporte[],
  pdf: Uint8Array,
) {
  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "IMPRIMIR",
    entidad: "Reporte",
    datosNuevos: {
      reporte: tipo,
      filtros: Object.fromEntries(
        filtros.map((filtro) => [filtro.etiqueta, filtro.valor]),
      ),
    },
    ip: req.ip,
  });

  const descargar = req.query.descargar === "1";
  const nombreArchivo = `${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Content-Disposition",
    `${descargar ? "attachment" : "inline"}; filename="${nombreArchivo}"`,
  );
  res.send(Buffer.from(pdf));
}

reportesRouter.get("/bienes-por-area", async (req, res) => {
  const filtros = bienesQuery.parse(req.query);
  res.json(await obtenerBienesPorArea(filtros));
});

reportesRouter.get("/bienes-por-responsable", async (req, res) => {
  const filtros = bienesQuery.parse(req.query);
  res.json(await obtenerBienesPorResponsable(filtros));
});

reportesRouter.get("/consumibles-stock", async (req, res) => {
  const filtros = consumiblesQuery.parse(req.query);
  res.json(await obtenerConsumiblesStock(filtros));
});

reportesRouter.get("/movimientos-stock", async (req, res) => {
  const filtros = movimientosQuery.parse(req.query);
  res.json(await obtenerMovimientosStock(filtros));
});

reportesRouter.get("/compras-periodo", async (req, res) => {
  const filtros = comprasQuery.parse(req.query);
  res.json(await obtenerComprasPeriodo(filtros));
});

reportesRouter.get("/bienes-por-area.pdf", async (req, res) => {
  const filtros = bienesQuery.parse(req.query);
  const [reporte, area, responsable] = await Promise.all([
    obtenerBienesPorArea(filtros),
    buscarArea(filtros.areaId),
    buscarPersona(filtros.responsableId),
  ]);

  const resumen: SeccionReporte = {
    titulo: "Resumen por área",
    columnas: [
      { titulo: "Área", peso: 44 },
      { titulo: "Responsable", peso: 38 },
      { titulo: "Bienes activos", peso: 18, alineacion: "right", maxLineas: 1 },
    ],
    filas: reporte.resumen.map((item) => [
      item.area,
      item.responsable,
      numero(item.cantidad),
    ]),
    totales: [
      `Total: ${numero(reporte.resumen.length)} áreas · ${numero(reporte.total)} bienes activos.`,
    ],
  };

  const detalle: SeccionReporte = {
    titulo: "Detalle de bienes",
    columnas: [
      { titulo: "Código", peso: 15, maxLineas: 1 },
      { titulo: "Descripción", peso: 38, maxLineas: 5 },
      { titulo: "Área", peso: 20, maxLineas: 2 },
      { titulo: "Responsable", peso: 15, maxLineas: 2 },
      { titulo: "Estado", peso: 12, maxLineas: 2 },
    ],
    filas: reporte.items.map((bien) => [
      bien.codigoInventario,
      bien.descripcion,
      bien.area?.nombre ?? "Sin área",
      nombrePersona(bien.subresponsable ?? bien.area?.responsable),
      bien.estado?.nombre ?? "-",
    ]),
    totales: [`Total: ${numero(reporte.total)} bienes activos.`],
  };

  const pdf = await generarReportePdf({
    titulo: "Reporte de bienes por área",
    filtros: etiquetasBienes(filtros, area, responsable),
    secciones: [resumen, detalle],
  });

  await enviarPdf(
    req,
    res,
    "reporte-bienes-por-area",
    etiquetasBienes(filtros, area, responsable),
    pdf,
  );
});

reportesRouter.get("/bienes-por-responsable.pdf", async (req, res) => {
  const filtros = bienesQuery.parse(req.query);
  const [reporte, area, responsable] = await Promise.all([
    obtenerBienesPorResponsable(filtros),
    buscarArea(filtros.areaId),
    buscarPersona(filtros.responsableId),
  ]);

  const seccion: SeccionReporte = {
    titulo: "Bienes por responsable",
    columnas: [
      { titulo: "Código", peso: 15, maxLineas: 1 },
      { titulo: "Descripción", peso: 38, maxLineas: 5 },
      { titulo: "Responsable", peso: 20, maxLineas: 2 },
      { titulo: "Área", peso: 15, maxLineas: 2 },
      { titulo: "Estado", peso: 12, maxLineas: 2 },
    ],
    filas: reporte.items.map((bien) => [
      bien.codigoInventario,
      bien.descripcion,
      nombrePersona(bien.responsable),
      bien.area?.nombre ?? "Sin área",
      bien.estado?.nombre ?? "-",
    ]),
    totales: [`Total: ${numero(reporte.total)} bienes activos.`],
  };

  const filtrosReporte = etiquetasBienes(filtros, area, responsable);
  const pdf = await generarReportePdf({
    titulo: "Reporte de bienes por responsable",
    filtros: filtrosReporte,
    secciones: [seccion],
  });

  await enviarPdf(
    req,
    res,
    "reporte-bienes-por-responsable",
    filtrosReporte,
    pdf,
  );
});

reportesRouter.get("/consumibles-stock.pdf", async (req, res) => {
  const filtros = consumiblesQuery.parse(req.query);
  const [reporte, categoria] = await Promise.all([
    obtenerConsumiblesStock(filtros),
    buscarCategoria(filtros.categoriaId),
  ]);

  const filtrosReporte: FiltroReporte[] = [];
  if (filtros.q) filtrosReporte.push({ etiqueta: "Búsqueda", valor: filtros.q });
  if (filtros.categoriaId) {
    filtrosReporte.push({
      etiqueta: "Categoría",
      valor: categoria?.nombre ?? `Categoría #${filtros.categoriaId}`,
    });
  }
  if (filtros.soloStockBajo === "true") {
    filtrosReporte.push({ etiqueta: "Stock", valor: "Solo stock bajo" });
  }

  const stockBajo = reporte.items.filter(
    (item) => Number(item.stockActual) <= Number(item.stockMinimo),
  ).length;

  const seccion: SeccionReporte = {
    titulo: "Stock de consumibles",
    columnas: [
      { titulo: "Consumible", peso: 35, maxLineas: 3 },
      { titulo: "Categoría", peso: 25, maxLineas: 2 },
      { titulo: "Stock", peso: 10, alineacion: "right", maxLineas: 1 },
      { titulo: "Mínimo", peso: 10, alineacion: "right", maxLineas: 1 },
      { titulo: "Unidad", peso: 12, maxLineas: 1 },
      { titulo: "Situación", peso: 13, maxLineas: 1 },
    ],
    filas: reporte.items.map((item) => {
      const bajo = Number(item.stockActual) <= Number(item.stockMinimo);
      return [
        item.nombre,
        item.categoria?.nombre ?? "-",
        numero(item.stockActual),
        numero(item.stockMinimo),
        item.unidadMedida,
        bajo ? "Reponer" : "Suficiente",
      ];
    }),
    totales: [
      `Total: ${numero(reporte.total)} consumibles · ${numero(stockBajo)} con stock bajo.`,
    ],
  };

  const pdf = await generarReportePdf({
    titulo: "Reporte de stock de consumibles",
    filtros: filtrosReporte,
    secciones: [seccion],
  });

  await enviarPdf(
    req,
    res,
    "reporte-stock-consumibles",
    filtrosReporte,
    pdf,
  );
});

reportesRouter.get("/movimientos-stock.pdf", async (req, res) => {
  const filtros = movimientosQuery.parse(req.query);
  const [reporte, area] = await Promise.all([
    obtenerMovimientosStock(filtros),
    buscarArea(filtros.areaId),
  ]);

  const filtrosReporte = etiquetasPeriodo(filtros.desde, filtros.hasta);
  if (filtros.areaId) {
    filtrosReporte.push({
      etiqueta: "Área",
      valor: area?.nombre ?? `Área #${filtros.areaId}`,
    });
  }
  if (filtros.tipo) {
    filtrosReporte.push({
      etiqueta: "Tipo",
      valor: tipoMovimiento[filtros.tipo],
    });
  }

  const seccion: SeccionReporte = {
    titulo: "Movimientos de stock",
    columnas: [
      { titulo: "Fecha", peso: 21, maxLineas: 1 },
      { titulo: "Consumible", peso: 24, maxLineas: 3 },
      { titulo: "Tipo", peso: 9, maxLineas: 1 },
      { titulo: "Cant.", peso: 7, alineacion: "right", maxLineas: 1 },
      { titulo: "Área destino", peso: 17, maxLineas: 2 },
      { titulo: "Usuario", peso: 14, maxLineas: 2 },
      { titulo: "Origen", peso: 20, maxLineas: 3 },
    ],
    filas: reporte.items.map((movimiento) => [
      fechaHora(movimiento.fecha),
      movimiento.consumible?.nombre ??
        movimiento.nombreConsumibleSnapshot ??
        "-",
      tipoMovimiento[movimiento.tipo] ?? movimiento.tipo,
      numero(movimiento.cantidad),
      movimiento.areaDestino?.nombre ?? "-",
      nombrePersona(movimiento.usuario),
      movimiento.entrega
        ? `Entrega ${movimiento.entrega.numero}`
        : movimiento.compra
          ? `Compra #${movimiento.compra.id}`
          : "-",
    ]),
    totales: [`Total: ${numero(reporte.total)} movimientos.`],
    nota: notaTruncado(reporte.total, reporte.items.length),
  };

  const pdf = await generarReportePdf({
    titulo: "Reporte de movimientos de stock",
    filtros: filtrosReporte,
    secciones: [seccion],
  });

  await enviarPdf(
    req,
    res,
    "reporte-movimientos-stock",
    filtrosReporte,
    pdf,
  );
});

reportesRouter.get("/compras-periodo.pdf", async (req, res) => {
  const filtros = comprasQuery.parse(req.query);
  const [reporte, area] = await Promise.all([
    obtenerComprasPeriodo(filtros),
    buscarArea(filtros.areaId),
  ]);

  const filtrosReporte = etiquetasPeriodo(filtros.desde, filtros.hasta);
  if (filtros.areaId) {
    filtrosReporte.push({
      etiqueta: "Área",
      valor: area?.nombre ?? `Área #${filtros.areaId}`,
    });
  }
  if (filtros.organismo) {
    filtrosReporte.push({ etiqueta: "Organismo", valor: filtros.organismo });
  }
  if (filtros.estado) {
    filtrosReporte.push({
      etiqueta: "Estado",
      valor: estadoCompra[filtros.estado],
    });
  }

  const seccion: SeccionReporte = {
    titulo: "Compras del período",
    columnas: [
      { titulo: "Fecha", peso: 13, maxLineas: 1 },
      { titulo: "OP", peso: 10, maxLineas: 2 },
      { titulo: "Organismo", peso: 11, maxLineas: 1 },
      { titulo: "Área destino", peso: 17, maxLineas: 2 },
      { titulo: "Proveedor", peso: 21, maxLineas: 3 },
      { titulo: "Ítems", peso: 8, alineacion: "right", maxLineas: 1 },
      { titulo: "Total", peso: 15, alineacion: "right", maxLineas: 1 },
      { titulo: "Estado", peso: 9, maxLineas: 1 },
    ],
    filas: reporte.items.map((compra) => [
      fechaCorta(compra.fecha),
      compra.numeroOrdenPago ?? "-",
      compra.organismo,
      compra.areaDestino?.nombre ?? "-",
      compra.proveedorDatos?.nombre ?? compra.proveedor ?? "-",
      numero(compra.detalles.length),
      moneda(totalCompra(compra)),
      estadoCompra[compra.estado] ?? compra.estado,
    ]),
    totales: [
      `Compras registradas: ${numero(reporte.total)}.`,
      `Total del período: ${moneda(reporte.totalPeriodo)}.`,
    ],
    nota: notaTruncado(reporte.total, reporte.items.length),
  };

  const pdf = await generarReportePdf({
    titulo: "Reporte de compras del período",
    filtros: filtrosReporte,
    secciones: [seccion],
  });

  await enviarPdf(
    req,
    res,
    "reporte-compras-periodo",
    filtrosReporte,
    pdf,
  );
});
