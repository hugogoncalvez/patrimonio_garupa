import type { NextFunction, Request, Response } from "express";
import { verificarToken } from "../lib/auth.js";
import type { Rol } from "../types.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }

  try {
    req.usuario = verificarToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o vencido" });
  }
}

export function requireRole(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (!roles.includes(req.usuario.rol)) {
      res.status(403).json({ error: "No tenés permisos para esta acción" });
      return;
    }

    next();
  };
}
