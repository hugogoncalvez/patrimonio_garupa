import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { idParam } from "../lib/zod.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const usuariosRouter = Router();

usuariosRouter.use(requireAuth, requireRole("CONTABLE"));

const usuarioSelect = {
  id: true,
  nombre: true,
  apellido: true,
  usuario: true,
  rol: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
} as const;

const usuarioSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  usuario: z.string().trim().min(3, "Mínimo 3 caracteres").max(50),
  pass: z.string().min(6, "La clave debe tener al menos 6 caracteres").max(100),
  rol: z.enum(["CONTABLE", "PATRIMONIO"]).default("PATRIMONIO"),
  activo: z.boolean().optional(),
});

const usuarioUpdateSchema = usuarioSchema.partial();

usuariosRouter.get("/", async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: usuarioSelect,
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  res.json(usuarios);
});

usuariosRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: usuarioSelect,
  });

  if (!usuario) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  res.json(usuario);
});

usuariosRouter.post("/", async (req, res) => {
  const data = usuarioSchema.parse(req.body);

  const creado = await prisma.usuario.create({
    data: {
      ...data,
      pass: await bcrypt.hash(data.pass, 10),
    },
    select: usuarioSelect,
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "Usuario",
    entidadId: creado.id,
    datosNuevos: creado,
    ip: req.ip,
  });

  res.status(201).json(creado);
});

usuariosRouter.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = usuarioUpdateSchema.parse(req.body);

  if (id === req.usuario!.id && data.activo === false) {
    throw new HttpError(400, "No podés desactivar tu propio usuario");
  }

  const anterior = await prisma.usuario.findUnique({
    where: { id },
    select: usuarioSelect,
  });

  if (!anterior) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  const { pass, ...resto } = data;
  const actualizado = await prisma.usuario.update({
    where: { id },
    data: {
      ...resto,
      ...(pass ? { pass: await bcrypt.hash(pass, 10) } : {}),
    },
    select: usuarioSelect,
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "Usuario",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

usuariosRouter.delete("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);

  if (id === req.usuario!.id) {
    throw new HttpError(400, "No podés desactivar tu propio usuario");
  }

  const anterior = await prisma.usuario.findUnique({
    where: { id },
    select: usuarioSelect,
  });

  if (!anterior) {
    throw new HttpError(404, "Usuario no encontrado");
  }

  const actualizado = await prisma.usuario.update({
    where: { id },
    data: { activo: false },
    select: usuarioSelect,
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ELIMINAR",
    entidad: "Usuario",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});
