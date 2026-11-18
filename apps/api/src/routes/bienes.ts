import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import {
  fechaOpcional,
  idOpcional,
  idParam,
  numeroOpcional,
  textoOpcional,
} from "../lib/zod.js";
import { requireAuth } from "../middleware/auth.js";

export const bienesRouter = Router();

bienesRouter.use(requireAuth);

const bienInclude = {
  rubro: { select: { id: true, nombre: true, codigoCuenta: true } },
  estado: { select: { id: true, nombre: true } },
  area: { select: { id: true, nombre: true } },
  subresponsable: { select: { id: true, nombre: true, apellido: true } },
} as const;

const personaMini = {
  select: { id: true, nombre: true, apellido: true },
} as const;

const usuarioMini = {
  select: { id: true, nombre: true, apellido: true },
} as const;

const bienSchema = z.object({
  codigoInventario: z.string().trim().min(1, "El código es obligatorio").max(40),
  numeroIdentificacion: z
    .string()
    .trim()
    .min(1, "El número de identificación es obligatorio")
    .max(40),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria").max(300),
  marca: textoOpcional(120),
  modelo: textoOpcional(120),
  numeroSerie: textoOpcional(120),
  numeroMotor: textoOpcional(120),
  patente: textoOpcional(30),
  material: textoOpcional(120),
  medidas: textoOpcional(120),
  color: textoOpcional(80),
  rubroId: z.coerce.number().int().positive(),
  estadoId: z.coerce.number().int().positive(),
  areaId: idOpcional,
  subresponsableId: idOpcional,
  tipoIncorporacion: z
    .enum(["COMPRA", "DONACION", "TRANSFERENCIA", "PRESTAMO", "OTRO"])
    .optional(),
  fechaAlta: z.coerce.date(),
  valorHistorico: numeroOpcional,
  observaciones: textoOpcional(2000),
});

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  rubroId: z.coerce.number().int().positive().optional(),
  estadoId: z.coerce.number().int().positive().optional(),
  areaId: z.coerce.number().int().positive().optional(),
  activo: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const bajaSchema = z.object({
  fechaBaja: fechaOpcional,
  motivoBaja: textoOpcional(200),
  destinoBaja: textoOpcional(200),
  numeroResolucionBaja: textoOpcional(40),
  fechaResolucionBaja: fechaOpcional,
  valorBaja: numeroOpcional,
  numeroOrdenPago: textoOpcional(40),
});

bienesRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where: any = {};

  if (query.q) {
    where.OR = [
      { codigoInventario: { contains: query.q, mode: "insensitive" } },
      { numeroIdentificacion: { contains: query.q, mode: "insensitive" } },
      { descripcion: { contains: query.q, mode: "insensitive" } },
      { marca: { contains: query.q, mode: "insensitive" } },
      { modelo: { contains: query.q, mode: "insensitive" } },
      { numeroSerie: { contains: query.q, mode: "insensitive" } },
      { patente: { contains: query.q, mode: "insensitive" } },
    ];
  }

  if (query.rubroId) where.rubroId = query.rubroId;
  if (query.estadoId) where.estadoId = query.estadoId;
  if (query.areaId) where.areaId = query.areaId;
  if (query.activo !== undefined) where.activo = query.activo === "true";

  const [items, total] = await Promise.all([
    prisma.bien.findMany({
      where,
      include: bienInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.bien.count({ where }),
  ]);

  res.json({
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
});

bienesRouter.post("/", async (req, res) => {
  const data = bienSchema.parse(req.body);

  const creado = await prisma.$transaction(async (tx) => {
    const bien = await tx.bien.create({
      data: { ...data, creadoPorId: req.usuario!.id },
      include: bienInclude,
    });

    if (data.areaId) {
      await tx.movimientoUbicacion.create({
        data: {
          bienId: bien.id,
          tipo: "ASIGNACION",
          areaDestinoId: data.areaId,
          usuarioId: req.usuario!.id,
        },
      });
    }

    if (data.subresponsableId) {
      await tx.movimientoCustodia.create({
        data: {
          bienId: bien.id,
          tipo: "ASIGNACION",
          personaDestinoId: data.subresponsableId,
          usuarioId: req.usuario!.id,
        },
      });
    }

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "CREAR",
      entidad: "Bien",
      entidadId: bien.id,
      datosNuevos: bien,
      ip: req.ip,
    });

    return bien;
  });

  res.status(201).json(creado);
});

bienesRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);

  const bien = await prisma.bien.findUnique({
    where: { id },
    include: {
      ...bienInclude,
      movimientosCustodia: {
        orderBy: { fecha: "desc" },
        include: {
          personaOrigen: personaMini,
          personaDestino: personaMini,
          usuario: usuarioMini,
        },
      },
      movimientosUbicacion: {
        orderBy: { fecha: "desc" },
        include: {
          areaOrigen: { select: { id: true, nombre: true } },
          areaDestino: { select: { id: true, nombre: true } },
          usuario: usuarioMini,
        },
      },
      documentos: { orderBy: { createdAt: "desc" } },
      compraDetalle: {
        include: {
          compra: {
            select: {
              id: true,
              fecha: true,
              proveedor: true,
              numeroOrdenPago: true,
              comprobantes: {
                select: { id: true, tipo: true, numero: true, fecha: true },
              },
            },
          },
        },
      },
      actaRecepcion: {
        select: { id: true, numero: true, fecha: true },
      },
    },
  });

  if (!bien) {
    throw new HttpError(404, "Bien no encontrado");
  }

  res.json(bien);
});

bienesRouter.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = bienSchema.partial().parse(req.body);

  const anterior = await prisma.bien.findUnique({
    where: { id },
    include: bienInclude,
  });

  if (!anterior) {
    throw new HttpError(404, "Bien no encontrado");
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const bien = await tx.bien.update({
      where: { id },
      data,
      include: bienInclude,
    });

    if (data.areaId !== undefined && data.areaId !== anterior.areaId) {
      await tx.movimientoUbicacion.create({
        data: {
          bienId: id,
          tipo: data.areaId ? "TRANSFERENCIA" : "DEVOLUCION",
          areaOrigenId: anterior.areaId,
          areaDestinoId: data.areaId,
          usuarioId: req.usuario!.id,
        },
      });
    }

    if (
      data.subresponsableId !== undefined &&
      data.subresponsableId !== anterior.subresponsableId
    ) {
      await tx.movimientoCustodia.create({
        data: {
          bienId: id,
          tipo: data.subresponsableId ? "TRANSFERENCIA" : "DEVOLUCION",
          personaOrigenId: anterior.subresponsableId,
          personaDestinoId: data.subresponsableId,
          usuarioId: req.usuario!.id,
        },
      });
    }

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "ACTUALIZAR",
      entidad: "Bien",
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: bien,
      ip: req.ip,
    });

    return bien;
  });

  res.json(actualizado);
});

bienesRouter.patch("/:id/baja", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = bajaSchema.parse(req.body);

  const anterior = await prisma.bien.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Bien no encontrado");
  }

  if (!anterior.activo) {
    throw new HttpError(400, "El bien ya está dado de baja");
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const bien = await tx.bien.update({
      where: { id },
      data: {
        ...data,
        activo: false,
        fechaBaja: data.fechaBaja ?? new Date(),
      },
      include: bienInclude,
    });

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "ACTUALIZAR",
      entidad: "Bien",
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: bien,
      ip: req.ip,
    });

    return bien;
  });

  res.json(actualizado);
});

bienesRouter.patch("/:id/reactivar", async (req, res) => {
  const id = idParam.parse(req.params.id);

  const anterior = await prisma.bien.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Bien no encontrado");
  }

  if (anterior.activo) {
    throw new HttpError(400, "El bien ya está activo");
  }

  const actualizado = await prisma.$transaction(async (tx) => {
    const bien = await tx.bien.update({
      where: { id },
      data: {
        activo: true,
        fechaBaja: null,
        motivoBaja: null,
        destinoBaja: null,
      },
      include: bienInclude,
    });

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "ACTUALIZAR",
      entidad: "Bien",
      entidadId: id,
      datosAnteriores: anterior,
      datosNuevos: bien,
      ip: req.ip,
    });

    return bien;
  });

  res.json(actualizado);
});
