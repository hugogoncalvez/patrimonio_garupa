import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "La ruta solicitada no existe" });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const tipo = (err as { type?: string }).type;

  if (tipo === "entity.parse.failed") {
    res.status(400).json({
      error: "El cuerpo de la solicitud no tiene un formato JSON válido",
    });
    return;
  }

  if (tipo === "entity.too.large") {
    res.status(413).json({
      error: "La solicitud supera el tamaño máximo permitido",
    });
    return;
  }

  if (tipo === "encoding.unsupported") {
    res.status(415).json({
      error: "La codificación de la solicitud no está soportada",
    });
    return;
  }

  if (err instanceof Error && err.name === "MulterError") {
    const code = (err as { code?: string }).code;
    res.status(400).json({
      error:
        code === "LIMIT_FILE_SIZE"
          ? "El archivo supera el límite de 15 MB"
          : "No se pudo procesar el archivo",
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos inválidos",
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  const code = (err as { code?: string }).code;
  const meta = (err as { meta?: { target?: string[] | string } }).meta;

  if (code === "P2002") {
    const target = Array.isArray(meta?.target)
      ? meta.target.join(", ")
      : "ese valor";
    res.status(409).json({ error: `Ya existe un registro con ${target}` });
    return;
  }

  if (code === "P2003") {
    res.status(409).json({
      error: "No se puede completar la operación porque hay registros relacionados",
    });
    return;
  }

  if (code === "P2025") {
    res.status(404).json({ error: "Registro no encontrado" });
    return;
  }

  if (code === "P2000") {
    res.status(400).json({
      error: "Uno de los valores enviados es demasiado largo",
    });
    return;
  }

  if (code === "P2011" || code === "P2012") {
    res.status(400).json({
      error: "Faltan datos obligatorios para completar la operación",
    });
    return;
  }

  if (code === "P2023") {
    res.status(400).json({
      error: "Uno de los identificadores enviados no es válido",
    });
    return;
  }

  console.error(`${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: "Error interno del servidor" });
}
