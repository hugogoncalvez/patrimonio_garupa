import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

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

function finDelDia(fecha: Date | undefined) {
  if (!fecha) return undefined;
  const resultado = new Date(fecha);
  resultado.setUTCHours(23, 59, 59, 999);
  return resultado;
}

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

const bienInclude = {
  rubro: { select: { id: true, nombre: true } },
  estado: { select: { id: true, nombre: true } },
  area: {
    select: {
      id: true,
      nombre: true,
      responsable: { select: { id: true, nombre: true, apellido: true } },
    },
  },
  subresponsable: { select: { id: true, nombre: true, apellido: true } },
} as const;

async function listarBienes(filtros: z.infer<typeof bienesQuery>) {
  const condiciones: any[] = [{ activo: true }];

  if (filtros.areaId) {
    condiciones.push({ areaId: filtros.areaId });
  }

  if (filtros.responsableId) {
    condiciones.push({
      OR: [
        { subresponsableId: filtros.responsableId },
        { area: { responsableId: filtros.responsableId } },
      ],
    });
  }

  const items = await prisma.bien.findMany({
    where: { AND: condiciones },
    include: bienInclude,
    orderBy: [{ area: { nombre: "asc" } }, { descripcion: "asc" }],
  });

  return { items, total: items.length };
}

reportesRouter.get("/bienes-por-area", async (req, res) => {
  const filtros = bienesQuery.parse(req.query);
  const resultado = await listarBienes(filtros);

  const grupos = new Map<
    number,
    { areaId: number | null; area: string; responsable: string; cantidad: number }
  >();

  for (const bien of resultado.items) {
    const clave = bien.areaId ?? 0;
    const actual = grupos.get(clave) ?? {
      areaId: bien.areaId,
      area: bien.area?.nombre ?? "Sin área",
      responsable: bien.area?.responsable
        ? `${bien.area.responsable.apellido}, ${bien.area.responsable.nombre}`
        : "Sin responsable",
      cantidad: 0,
    };
    actual.cantidad += 1;
    grupos.set(clave, actual);
  }

  res.json({
    ...resultado,
    resumen: [...grupos.values()].sort((a, b) =>
      a.area.localeCompare(b.area, "es"),
    ),
  });
});

reportesRouter.get("/bienes-por-responsable", async (req, res) => {
  const filtros = bienesQuery.parse(req.query);
  const resultado = await listarBienes(filtros);

  res.json({
    ...resultado,
    items: resultado.items
      .map((bien) => ({
        ...bien,
        responsable: bien.subresponsable ?? bien.area?.responsable ?? null,
      }))
      .sort((a, b) => {
        const nombreA = a.responsable
          ? `${a.responsable.apellido}, ${a.responsable.nombre}`
          : "Sin responsable";
        const nombreB = b.responsable
          ? `${b.responsable.apellido}, ${b.responsable.nombre}`
          : "Sin responsable";
        return nombreA.localeCompare(nombreB, "es");
      }),
  });
});

reportesRouter.get("/consumibles-stock", async (req, res) => {
  const filtros = consumiblesQuery.parse(req.query);
  const condiciones: any[] = [{ activo: true }];

  if (filtros.q) {
    condiciones.push({ nombre: { contains: filtros.q, mode: "insensitive" } });
  }
  if (filtros.categoriaId) {
    condiciones.push({ categoriaId: filtros.categoriaId });
  }

  const items = await prisma.consumible.findMany({
    where: { AND: condiciones },
    include: { categoria: { select: { id: true, nombre: true } } },
    orderBy: { nombre: "asc" },
  });

  const filtrados =
    filtros.soloStockBajo === "true"
      ? items.filter(
          (item) => Number(item.stockActual) <= Number(item.stockMinimo),
        )
      : items;

  res.json({ items: filtrados, total: filtrados.length });
});

reportesRouter.get("/movimientos-stock", async (req, res) => {
  const filtros = movimientosQuery.parse(req.query);
  const where: any = {};

  if (filtros.desde || filtros.hasta) {
    where.fecha = {
      ...(filtros.desde ? { gte: filtros.desde } : {}),
      ...(filtros.hasta ? { lte: finDelDia(filtros.hasta) } : {}),
    };
  }
  if (filtros.areaId) where.areaDestinoId = filtros.areaId;
  if (filtros.tipo) where.tipo = filtros.tipo;

  const [items, total] = await Promise.all([
    prisma.movimientoStock.findMany({
      where,
      include: {
        consumible: { select: { id: true, nombre: true } },
        areaDestino: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
        compra: { select: { id: true, numeroOrdenPago: true } },
        entrega: { select: { id: true, numero: true } },
      },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      take: 1000,
    }),
    prisma.movimientoStock.count({ where }),
  ]);

  res.json({ items, total });
});

reportesRouter.get("/compras-periodo", async (req, res) => {
  const filtros = comprasQuery.parse(req.query);
  const where: any = {};

  if (filtros.desde || filtros.hasta) {
    where.fecha = {
      ...(filtros.desde ? { gte: filtros.desde } : {}),
      ...(filtros.hasta ? { lte: finDelDia(filtros.hasta) } : {}),
    };
  }
  if (filtros.areaId) where.areaDestinoId = filtros.areaId;
  if (filtros.organismo) where.organismo = filtros.organismo;
  if (filtros.estado) where.estado = filtros.estado;

  const [items, total] = await Promise.all([
    prisma.compra.findMany({
      where,
      include: {
        proveedorDatos: { select: { id: true, nombre: true } },
        areaDestino: { select: { id: true, nombre: true } },
        comprobantes: true,
        detalles: {
          select: {
            id: true,
            tipo: true,
            cantidad: true,
            cantidadRecibida: true,
            precioUnitario: true,
            descripcion: true,
          },
        },
      },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      take: 1000,
    }),
    prisma.compra.count({ where }),
  ]);

  const totalPeriodo = items.reduce(
    (suma, compra) =>
      suma +
      compra.detalles.reduce(
        (subtotal, detalle) =>
          subtotal + Number(detalle.cantidad) * Number(detalle.precioUnitario ?? 0),
        0,
      ),
    0,
  );

  res.json({ items, total, totalPeriodo });
});
