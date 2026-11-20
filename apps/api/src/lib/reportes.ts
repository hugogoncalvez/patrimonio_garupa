import { prisma } from "./prisma.js";

export const LIMITE_REPORTE = 1000;

export interface FiltrosBienes {
  areaId?: number;
  responsableId?: number;
}

export interface FiltrosConsumibles {
  q?: string;
  categoriaId?: number;
  soloStockBajo?: "true" | "false";
}

export interface FiltrosMovimientos {
  desde?: Date;
  hasta?: Date;
  areaId?: number;
  tipo?: "INGRESO" | "ENTREGA" | "AJUSTE";
}

export interface FiltrosCompras {
  desde?: Date;
  hasta?: Date;
  areaId?: number;
  organismo?: "DE" | "HCD";
  estado?: "REGISTRADA" | "RECIBIDA_PARCIAL" | "RECIBIDA";
}

export const bienInclude = {
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

export function finDelDia(fecha: Date | undefined) {
  if (!fecha) return undefined;
  const resultado = new Date(fecha);
  resultado.setUTCHours(23, 59, 59, 999);
  return resultado;
}

export async function listarBienes(filtros: FiltrosBienes) {
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

export async function obtenerBienesPorArea(filtros: FiltrosBienes) {
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

  return {
    ...resultado,
    resumen: [...grupos.values()].sort((a, b) =>
      a.area.localeCompare(b.area, "es"),
    ),
  };
}

export async function obtenerBienesPorResponsable(filtros: FiltrosBienes) {
  const resultado = await listarBienes(filtros);

  return {
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
  };
}

export async function obtenerConsumiblesStock(filtros: FiltrosConsumibles) {
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

  return { items: filtrados, total: filtrados.length };
}

export async function obtenerMovimientosStock(filtros: FiltrosMovimientos) {
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
      take: LIMITE_REPORTE,
    }),
    prisma.movimientoStock.count({ where }),
  ]);

  return { items, total };
}

export async function obtenerComprasPeriodo(filtros: FiltrosCompras) {
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

  const [items, total, detalles] = await Promise.all([
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
      take: LIMITE_REPORTE,
    }),
    prisma.compra.count({ where }),
    prisma.compraDetalle.findMany({
      where: { compra: where },
      select: { cantidad: true, precioUnitario: true },
    }),
  ]);

  const totalPeriodo = detalles.reduce(
    (suma, detalle) =>
      suma + Number(detalle.cantidad) * Number(detalle.precioUnitario ?? 0),
    0,
  );

  return { items, total, totalPeriodo };
}
