import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { idOpcional, idParam, numeroOpcional, textoOpcional } from "../lib/zod.js";
import { requireAuth } from "../middleware/auth.js";

export const comprasRouter = Router();

comprasRouter.use(requireAuth);

const compraInclude = {
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  detalles: {
    include: {
      bien: {
        select: {
          id: true,
          codigoInventario: true,
          numeroIdentificacion: true,
          descripcion: true,
        },
      },
      consumible: {
        select: { id: true, nombre: true, unidadMedida: true },
      },
    },
  },
  documentos: true,
} as const;

const detalleSchema = z
  .object({
    bienId: idOpcional,
    consumibleId: idOpcional,
    cantidad: z.coerce.number().positive("La cantidad debe ser mayor a cero"),
    precioUnitario: numeroOpcional,
    descripcion: textoOpcional(250),
  })
  .refine(
    (data) =>
      (data.bienId ? 1 : 0) + (data.consumibleId ? 1 : 0) === 1,
    { message: "Cada detalle debe tener un bien o un consumible" },
  );

const compraSchema = z.object({
  fecha: z.coerce.date(),
  proveedor: textoOpcional(150),
  tipoComprobante: textoOpcional(50),
  numeroComprobante: textoOpcional(50),
  numeroExpediente: textoOpcional(50),
  observaciones: textoOpcional(2000),
  detalles: z.array(detalleSchema).min(1, "Agregá al menos un detalle"),
});

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

comprasRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where: any = {};

  if (query.q) {
    where.OR = [
      { proveedor: { contains: query.q, mode: "insensitive" } },
      { numeroComprobante: { contains: query.q, mode: "insensitive" } },
      { numeroExpediente: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.compra.findMany({
      where,
      include: compraInclude,
      orderBy: { fecha: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.compra.count({ where }),
  ]);

  res.json({
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
});

comprasRouter.post("/", async (req, res) => {
  const data = compraSchema.parse(req.body);
  const { detalles, ...cabecera } = data;

  const creada = await prisma.$transaction(async (tx) => {
    for (const detalle of detalles) {
      if (detalle.consumibleId) {
        const consumible = await tx.consumible.findUnique({
          where: { id: detalle.consumibleId },
        });
        if (!consumible) {
          throw new HttpError(
            404,
            `Consumible ${detalle.consumibleId} no encontrado`,
          );
        }
      }

      if (detalle.bienId) {
        const bien = await tx.bien.findUnique({ where: { id: detalle.bienId } });
        if (!bien) {
          throw new HttpError(404, `Bien ${detalle.bienId} no encontrado`);
        }
      }
    }

    const compra = await tx.compra.create({
      data: {
        ...cabecera,
        creadoPorId: req.usuario!.id,
        detalles: {
          create: detalles.map((detalle) => ({
            bienId: detalle.bienId,
            consumibleId: detalle.consumibleId,
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precioUnitario,
            descripcion: detalle.descripcion,
          })),
        },
      },
      include: compraInclude,
    });

    for (const detalle of detalles) {
      if (!detalle.consumibleId) continue;

      const consumible = await tx.consumible.findUniqueOrThrow({
        where: { id: detalle.consumibleId },
      });

      const nuevoStock = Number(consumible.stockActual) + detalle.cantidad;

      await tx.consumible.update({
        where: { id: consumible.id },
        data: { stockActual: nuevoStock },
      });

      await tx.movimientoStock.create({
        data: {
          consumibleId: consumible.id,
          tipo: "INGRESO",
          cantidad: detalle.cantidad,
          compraId: compra.id,
          usuarioId: req.usuario!.id,
          observaciones: `Ingreso por compra #${compra.id}`,
        },
      });
    }

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "CREAR",
      entidad: "Compra",
      entidadId: compra.id,
      datosNuevos: compra,
      ip: req.ip,
    });

    return compra;
  });

  res.status(201).json(creada);
});

comprasRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);

  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      ...compraInclude,
      movimientosStock: {
        include: {
          consumible: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  if (!compra) {
    throw new HttpError(404, "Compra no encontrada");
  }

  res.json(compra);
});
