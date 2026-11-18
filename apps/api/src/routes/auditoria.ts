import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { idParam } from "../lib/zod.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const auditoriaRouter = Router();

auditoriaRouter.use(requireAuth, requireRole("CONTABLE"));

const acciones = [
  "CREAR",
  "ACTUALIZAR",
  "ELIMINAR",
  "LOGIN",
  "IMPRIMIR",
  "ANULAR",
] as const;

const listaQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  accion: z.enum(acciones).optional(),
  entidad: z.string().trim().max(80).optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const usuarioMini = {
  select: {
    id: true,
    nombre: true,
    apellido: true,
    usuario: true,
  },
} as const;

auditoriaRouter.get("/", async (req, res) => {
  const query = listaQuerySchema.parse(req.query);

  if (query.desde && query.hasta && query.desde > query.hasta) {
    throw new HttpError(400, "El rango de fechas no es válido");
  }

  const where: any = {};

  if (query.accion) where.accion = query.accion;
  if (query.entidad) where.entidad = query.entidad;
  if (query.usuarioId) where.usuarioId = query.usuarioId;

  if (query.desde || query.hasta) {
    where.fecha = {};
    if (query.desde) where.fecha.gte = query.desde;
    if (query.hasta) where.fecha.lte = query.hasta;
  }

  if (query.q) {
    where.OR = [
      { entidad: { contains: query.q, mode: "insensitive" } },
      { ip: { contains: query.q, mode: "insensitive" } },
      {
        usuario: {
          is: { nombre: { contains: query.q, mode: "insensitive" } },
        },
      },
      {
        usuario: {
          is: { apellido: { contains: query.q, mode: "insensitive" } },
        },
      },
      {
        usuario: {
          is: { usuario: { contains: query.q, mode: "insensitive" } },
        },
      },
    ];

    const entidadId = Number(query.q);
    if (Number.isInteger(entidadId) && entidadId > 0) {
      where.OR.push({ entidadId });
    }
  }

  const [items, total, entidades] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      select: {
        id: true,
        usuarioId: true,
        usuario: usuarioMini,
        accion: true,
        entidad: true,
        entidadId: true,
        ip: true,
        fecha: true,
      },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.auditoria.count({ where }),
    prisma.auditoria.groupBy({
      by: ["entidad"],
      _count: { _all: true },
      orderBy: { entidad: "asc" },
    }),
  ]);

  res.json({
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
    entidades: entidades.map((item) => item.entidad),
  });
});

auditoriaRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);

  const item = await prisma.auditoria.findUnique({
    where: { id },
    include: { usuario: usuarioMini },
  });

  if (!item) {
    throw new HttpError(404, "Registro de auditoría no encontrado");
  }

  res.json(item);
});
