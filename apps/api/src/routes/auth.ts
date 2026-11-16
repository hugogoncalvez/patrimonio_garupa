import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { firmarToken } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  usuario: z
    .string({ error: "Ingresá tu usuario" })
    .trim()
    .min(1, "Ingresá tu usuario"),
  password: z
    .string({ error: "Ingresá tu contraseña" })
    .min(1, "Ingresá tu contraseña"),
});

authRouter.post("/login", async (req, res) => {
  const { usuario, password } = loginSchema.parse(req.body);

  const user = await prisma.usuario.findUnique({ where: { usuario } });

  if (!user || !user.activo || !(await bcrypt.compare(password, user.pass))) {
    throw new HttpError(401, "Usuario o contraseña incorrectos");
  }

  const token = firmarToken({
    id: user.id,
    usuario: user.usuario,
    rol: user.rol,
    nombre: user.nombre,
    apellido: user.apellido,
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: user.id,
      accion: "LOGIN",
      entidad: "Usuario",
      entidadId: user.id,
      ip: req.ip,
    },
  });

  res.json({
    token,
    usuario: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      usuario: user.usuario,
      rol: user.rol,
    },
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.usuario.findUnique({
    where: { id: req.usuario!.id },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      usuario: true,
      rol: true,
      activo: true,
    },
  });

  if (!user || !user.activo) {
    throw new HttpError(401, "Usuario inactivo");
  }

  res.json(user);
});
