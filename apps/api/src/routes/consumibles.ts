import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { idOpcional, idParam, textoOpcional } from "../lib/zod.js";
import { requireAuth } from "../middleware/auth.js";

export const consumiblesRouter = Router();

consumiblesRouter.use(requireAuth);

const consumibleBaseSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  categoriaId: idOpcional,
  unidadMedida: z.string().trim().min(1).max(20).default("unidad"),
  stockMinimo: z.coerce.number().nonnegative().default(0),
  activo: z.boolean().optional(),
});

const consumibleCreateSchema = consumibleBaseSchema.extend({
  stockActual: z.coerce.number().nonnegative().default(0),
});

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  activo: z.enum(["true", "false"]).optional(),
  stockBajo: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const movimientoSchema = z
  .object({
    tipo: z.enum(["INGRESO", "AJUSTE"]),
    cantidad: z.coerce.number(),
    areaDestinoId: idOpcional,
    compraId: idOpcional,
    observaciones: textoOpcional(2000),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "AJUSTE") {
      if (data.cantidad === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["cantidad"],
          message: "El ajuste no puede ser cero",
        });
      }
      return;
    }

    if (data.cantidad <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cantidad"],
        message: "La cantidad debe ser mayor a cero",
      });
    }
  });

consumiblesRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where: any = {};

  if (query.q) {
    where.OR = [
      { nombre: { contains: query.q, mode: "insensitive" } },
      {
        categoria: {
          nombre: { contains: query.q, mode: "insensitive" },
        },
      },
    ];
  }

  if (query.activo !== undefined) where.activo = query.activo === "true";

  const todos = await prisma.consumible.findMany({
    where,
    orderBy: { nombre: "asc" },
    include: {
      categoria: { select: { id: true, nombre: true, activo: true } },
    },
  });

  const filtrados =
    query.stockBajo === "true"
      ? todos.filter(
          (item) => Number(item.stockActual) <= Number(item.stockMinimo),
        )
      : todos;

  const items = filtrados.slice(
    (query.page - 1) * query.limit,
    query.page * query.limit,
  );

  res.json({
    items,
    total: filtrados.length,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(filtrados.length / query.limit)),
  });
});

consumiblesRouter.post("/", async (req, res) => {
  const data = consumibleCreateSchema.parse(req.body);
  const stockInicial = data.stockActual;
  const { stockActual: _stockActual, ...resto } = data;

  const creado = await prisma.$transaction(async (tx) => {
    if (resto.categoriaId) {
      const categoria = await tx.categoriaConsumible.findUnique({
        where: { id: resto.categoriaId },
      });
      if (!categoria || !categoria.activo) {
        throw new HttpError(400, "La categoría seleccionada no está disponible");
      }
    }

    let consumible = await tx.consumible.create({
      data: { ...resto, stockActual: 0 },
      include: {
        categoria: { select: { id: true, nombre: true, activo: true } },
      },
    });

    if (stockInicial > 0) {
      await tx.movimientoStock.create({
        data: {
          consumibleId: consumible.id,
          tipo: "INGRESO",
          cantidad: stockInicial,
          usuarioId: req.usuario!.id,
          observaciones: "Stock inicial",
        },
      });

      consumible = await tx.consumible.update({
        where: { id: consumible.id },
        data: { stockActual: stockInicial },
        include: {
          categoria: { select: { id: true, nombre: true, activo: true } },
        },
      });
    }

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "CREAR",
      entidad: "Consumible",
      entidadId: consumible.id,
      datosNuevos: consumible,
      ip: req.ip,
    });

    return consumible;
  });

  res.status(201).json(creado);
});

consumiblesRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);

  const consumible = await prisma.consumible.findUnique({
    where: { id },
    include: {
      categoria: { select: { id: true, nombre: true, activo: true } },
      movimientos: {
        orderBy: { fecha: "desc" },
        take: 100,
        include: {
          areaDestino: { select: { id: true, nombre: true } },
          compra: { select: { id: true, fecha: true, proveedor: true } },
          usuario: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  });

  if (!consumible) {
    throw new HttpError(404, "Consumible no encontrado");
  }

  res.json(consumible);
});

consumiblesRouter.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = consumibleBaseSchema.partial().parse(req.body);

  const anterior = await prisma.consumible.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Consumible no encontrado");
  }

  if (data.categoriaId) {
    const categoria = await prisma.categoriaConsumible.findUnique({
      where: { id: data.categoriaId },
    });
    if (!categoria) {
      throw new HttpError(400, "La categoría seleccionada no existe");
    }
  }

  const actualizado = await prisma.consumible.update({
    where: { id },
    data,
    include: {
      categoria: { select: { id: true, nombre: true, activo: true } },
    },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "Consumible",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

consumiblesRouter.post("/:id/movimientos", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = movimientoSchema.parse(req.body);

  const resultado = await prisma.$transaction(async (tx) => {
    const consumible = await tx.consumible.findUnique({ where: { id } });

    if (!consumible) {
      throw new HttpError(404, "Consumible no encontrado");
    }

    const delta =
      data.tipo === "INGRESO" ? Math.abs(data.cantidad) : data.cantidad;

    const nuevoStock = Number(consumible.stockActual) + delta;

    if (nuevoStock < 0) {
      throw new HttpError(
        400,
        `Stock insuficiente. Stock actual: ${consumible.stockActual}`,
      );
    }

    const movimiento = await tx.movimientoStock.create({
      data: {
        consumibleId: id,
        tipo: data.tipo,
        cantidad: data.cantidad,
        areaDestinoId: data.areaDestinoId,
        compraId: data.compraId,
        usuarioId: req.usuario!.id,
        observaciones: data.observaciones,
      },
      include: {
        areaDestino: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    const actualizado = await tx.consumible.update({
      where: { id },
      data: { stockActual: nuevoStock },
    });

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "ACTUALIZAR",
      entidad: "Consumible",
      entidadId: id,
      datosAnteriores: consumible,
      datosNuevos: actualizado,
      ip: req.ip,
    });

    return { movimiento, consumible: actualizado };
  });

  res.status(201).json(resultado);
});
