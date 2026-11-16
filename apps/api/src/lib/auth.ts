import jwt from "jsonwebtoken";
import type { Rol, UsuarioToken } from "../types.js";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET no está configurada");
}

const jwtSecret: string = secret;

const roles: Rol[] = ["CONTABLE", "PATRIMONIO"];

export function firmarToken(usuario: UsuarioToken): string {
  return jwt.sign(
    {
      usuario: usuario.usuario,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
    },
    jwtSecret,
    { subject: String(usuario.id), expiresIn: "8h" },
  );
}

export function verificarToken(token: string): UsuarioToken {
  const decoded = jwt.verify(token, jwtSecret);

  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Token inválido");
  }

  const rol = String(decoded.rol) as Rol;

  if (!roles.includes(rol)) {
    throw new Error("Rol inválido");
  }

  return {
    id: Number(decoded.sub),
    usuario: String(decoded.usuario),
    rol,
    nombre: String(decoded.nombre),
    apellido: String(decoded.apellido),
  };
}
