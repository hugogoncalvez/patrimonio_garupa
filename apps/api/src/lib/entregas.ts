import { prisma } from "./prisma.js";
import { HttpError } from "./http.js";
import { registrarAuditoria } from "./audit.js";

export interface ItemEntregaInput {
  consumibleId: number;
  cantidad: number;
}

export interface CrearEntregaInput {
  fecha: Date;
  areaDestinoId: number;
  firmanteNombre: string;
  firmanteDni: string;
  observaciones?: string | null;
  items: ItemEntregaInput[];
  usuarioId: number;
  usuarioNombre: string;
  ip?: string | null;
}

const incluirEntrega = {
  areaDestino: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true, apellido: true } },
  anuladaPor: { select: { id: true, nombre: true, apellido: true } },
  movimientos: {
    orderBy: { orden: "asc" as const },
    include: {
      consumible: {
        select: {
          id: true,
          nombre: true,
          categoria: { select: { id: true, nombre: true } },
          unidadMedida: true,
        },
      },
    },
  },
};

function nombreCompleto(
  persona: { nombre: string; apellido: string } | null | undefined,
) {
  return persona ? `${persona.nombre} ${persona.apellido}`.trim() : null;
}

function numeroActa(ejercicio: number, numero: number) {
  return `E-${ejercicio}-${String(numero).padStart(6, "0")}`;
}

export async function crearEntregaConsumible(input: CrearEntregaInput) {
  const ids = input.items.map((item) => item.consumibleId);
  const unicos = new Set(ids);

  if (unicos.size !== ids.length) {
    throw new HttpError(400, "No se puede repetir un consumible en la entrega");
  }

  if (input.items.length === 0) {
    throw new HttpError(400, "La entrega debe tener al menos un consumible");
  }

  const ejercicio = input.fecha.getUTCFullYear();

  return prisma.$transaction(async (tx) => {
    const area = await tx.area.findUnique({
      where: { id: input.areaDestinoId },
      include: {
        responsable: { select: { nombre: true, apellido: true } },
      },
    });

    if (!area) {
      throw new HttpError(404, "Área destino no encontrada");
    }

    if (!area.activo) {
      throw new HttpError(400, "El área destino está inactiva");
    }

    const consumibles = await tx.consumible.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nombre: true,
        unidadMedida: true,
        activo: true,
        stockActual: true,
      },
    });

    if (consumibles.length !== ids.length) {
      throw new HttpError(400, "Uno o más consumibles no existen");
    }

    const porId = new Map(consumibles.map((item) => [item.id, item]));

    for (const item of input.items) {
      const consumible = porId.get(item.consumibleId)!;
      if (!consumible.activo) {
        throw new HttpError(
          400,
          `El consumible "${consumible.nombre}" está inactivo`,
        );
      }
      if (Number(consumible.stockActual) < item.cantidad) {
        throw new HttpError(
          400,
          `Stock insuficiente para "${consumible.nombre}". Disponible: ${consumible.stockActual}`,
        );
      }
    }

    const [contador] = await tx.$queryRaw<{ ultimoNumero: number }[]>`
      INSERT INTO "ContadorActa" ("ejercicio", "ultimoNumero", "updatedAt")
      VALUES (${ejercicio}, 1, NOW())
      ON CONFLICT ("ejercicio")
      DO UPDATE SET
        "ultimoNumero" = "ContadorActa"."ultimoNumero" + 1,
        "updatedAt" = NOW()
      RETURNING "ultimoNumero"
    `;

    const entrega = await tx.entregaConsumible.create({
      data: {
        numero: numeroActa(ejercicio, contador.ultimoNumero),
        fecha: input.fecha,
        areaDestinoId: area.id,
        areaNombreSnapshot: area.nombre,
        responsableNombreSnapshot: nombreCompleto(area.responsable),
        firmanteNombre: input.firmanteNombre,
        firmanteDni: input.firmanteDni,
        usuarioId: input.usuarioId,
        usuarioNombreSnapshot: input.usuarioNombre,
        observaciones: input.observaciones ?? null,
      },
    });

    const itemsOrdenados = [...input.items].sort(
      (a, b) => a.consumibleId - b.consumibleId,
    );

    for (const [indice, item] of itemsOrdenados.entries()) {
      const consumible = porId.get(item.consumibleId)!;

      const actualizado = await tx.consumible.updateMany({
        where: {
          id: item.consumibleId,
          activo: true,
          stockActual: { gte: item.cantidad },
        },
        data: { stockActual: { decrement: item.cantidad } },
      });

      if (actualizado.count === 0) {
        throw new HttpError(
          400,
          `Stock insuficiente para "${consumible.nombre}". La entrega no se registró`,
        );
      }

      await tx.movimientoStock.create({
        data: {
          consumibleId: item.consumibleId,
          tipo: "ENTREGA",
          cantidad: item.cantidad,
          areaDestinoId: area.id,
          entregaId: entrega.id,
          usuarioId: input.usuarioId,
          observaciones: input.observaciones ?? null,
          nombreConsumibleSnapshot: consumible.nombre,
          unidadMedidaSnapshot: consumible.unidadMedida,
          orden: indice + 1,
        },
      });
    }

    const completa = await tx.entregaConsumible.findUniqueOrThrow({
      where: { id: entrega.id },
      include: incluirEntrega,
    });

    await registrarAuditoria(tx, {
      usuarioId: input.usuarioId,
      accion: "CREAR",
      entidad: "EntregaConsumible",
      entidadId: entrega.id,
      datosNuevos: {
        numero: completa.numero,
        fecha: completa.fecha,
        areaDestino: completa.areaNombreSnapshot,
        firmante: completa.firmanteNombre,
        firmanteDni: completa.firmanteDni,
        observaciones: completa.observaciones,
        items: completa.movimientos.map((movimiento) => ({
          consumibleId: movimiento.consumibleId,
          nombre: movimiento.nombreConsumibleSnapshot,
          cantidad: movimiento.cantidad,
          unidadMedida: movimiento.unidadMedidaSnapshot,
        })),
      },
      ip: input.ip,
    });

    return completa;
  });
}

export async function anularEntregaConsumible(
  id: number,
  motivo: string,
  usuarioId: number,
  ip?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const entrega = await tx.entregaConsumible.findUnique({
      where: { id },
      include: {
        movimientos: { orderBy: { orden: "asc" } },
        areaDestino: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
        anuladaPor: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    if (!entrega) {
      throw new HttpError(404, "Entrega no encontrada");
    }

    if (entrega.estado === "ANULADA") {
      throw new HttpError(400, "La entrega ya está anulada");
    }

    for (const movimiento of entrega.movimientos) {
      await tx.consumible.update({
        where: { id: movimiento.consumibleId },
        data: { stockActual: { increment: movimiento.cantidad } },
      });

      await tx.movimientoStock.create({
        data: {
          consumibleId: movimiento.consumibleId,
          tipo: "INGRESO",
          cantidad: movimiento.cantidad,
          usuarioId,
          observaciones: `Anulación de ${entrega.numero}: ${motivo}`,
          nombreConsumibleSnapshot: movimiento.nombreConsumibleSnapshot,
          unidadMedidaSnapshot: movimiento.unidadMedidaSnapshot,
          orden: movimiento.orden,
        },
      });
    }

    const actualizada = await tx.entregaConsumible.update({
      where: { id },
      data: {
        estado: "ANULADA",
        anuladaPorId: usuarioId,
        fechaAnulacion: new Date(),
        motivoAnulacion: motivo,
      },
      include: incluirEntrega,
    });

    await registrarAuditoria(tx, {
      usuarioId,
      accion: "ANULAR",
      entidad: "EntregaConsumible",
      entidadId: id,
      datosAnteriores: entrega,
      datosNuevos: actualizada,
      ip,
    });

    return actualizada;
  });
}
