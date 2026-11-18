import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { idParam, textoOpcional } from "../lib/zod.js";
import { requireAuth } from "../middleware/auth.js";

export const proveedoresRouter = Router();

proveedoresRouter.use(requireAuth);

const proveedorSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  cuit: textoOpcional(20),
  telefono: textoOpcional(50),
  email: textoOpcional(120),
  direccion: textoOpcional(200),
  activo: z.boolean().optional(),
});

proveedoresRouter.get("/", async (req, res) => {
  const q = z.string().trim().optional().parse(req.query.q);
  const proveedores = await prisma.proveedor.findMany({
    where: {
      activo: true,
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" as const } },
              { cuit: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { nombre: "asc" },
    take: 100,
  });

  res.json(proveedores);
});

proveedoresRouter.post("/", async (req, res) => {
  const data = proveedorSchema.parse(req.body);
  const existente = await prisma.proveedor.findUnique({
    where: { nombre: data.nombre },
  });

  if (existente) {
    throw new HttpError(409, "Ya existe un proveedor con ese nombre");
  }

  const creado = await prisma.proveedor.create({ data });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "Proveedor",
    entidadId: creado.id,
    datosNuevos: creado,
    ip: req.ip,
  });

  res.status(201).json(creado);
});

proveedoresRouter.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = proveedorSchema.partial().parse(req.body);
  const anterior = await prisma.proveedor.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Proveedor no encontrado");
  }

  if (data.nombre && data.nombre !== anterior.nombre) {
    const existente = await prisma.proveedor.findUnique({
      where: { nombre: data.nombre },
    });
    if (existente) {
      throw new HttpError(409, "Ya existe un proveedor con ese nombre");
    }
  }

  const actualizado = await prisma.proveedor.update({
    where: { id },
    data,
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "Proveedor",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});
