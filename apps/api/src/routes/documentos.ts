import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { eliminarArchivo, guardarArchivo } from "../lib/storage.js";
import { fechaOpcional, idOpcional, idParam, textoOpcional } from "../lib/zod.js";
import { requireAuth } from "../middleware/auth.js";

export const documentosRouter = Router();

documentosRouter.use(requireAuth);

const mimePermitidos = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!mimePermitidos.has(file.mimetype)) {
      callback(new HttpError(400, "Tipo de archivo no permitido"));
      return;
    }
    callback(null, true);
  },
});

const documentoSchema = z
  .object({
    tipo: z.enum(["FACTURA", "REMITO", "ACTA", "RESOLUCION", "OTRO"]),
    numero: textoOpcional(60),
    fecha: fechaOpcional,
    bienId: idOpcional,
    compraId: idOpcional,
  })
  .refine((data) => (data.bienId ? 1 : 0) + (data.compraId ? 1 : 0) === 1, {
    message: "Indicá un bien o una compra",
  });

const listQuerySchema = z.object({
  bienId: idParam.optional(),
  compraId: idParam.optional(),
});

documentosRouter.get("/", async (req, res) => {
  const { bienId, compraId } = listQuerySchema.parse(req.query);

  const documentos = await prisma.documento.findMany({
    where: {
      ...(bienId ? { bienId } : {}),
      ...(compraId ? { compraId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(documentos);
});

documentosRouter.post("/", upload.single("archivo"), async (req, res) => {
  const data = documentoSchema.parse(req.body);

  if (!req.file) {
    throw new HttpError(400, "Adjuntá un archivo");
  }

  if (data.bienId) {
    const bien = await prisma.bien.findUnique({ where: { id: data.bienId } });
    if (!bien) throw new HttpError(404, "Bien no encontrado");
  }

  if (data.compraId) {
    const compra = await prisma.compra.findUnique({
      where: { id: data.compraId },
    });
    if (!compra) throw new HttpError(404, "Compra no encontrada");
  }

  const { archivoUrl } = await guardarArchivo(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
  );

  const documento = await prisma.documento.create({
    data: {
      tipo: data.tipo,
      numero: data.numero,
      fecha: data.fecha,
      nombreArchivo: req.file.originalname,
      archivoUrl,
      mimeType: req.file.mimetype,
      tamano: req.file.size,
      bienId: data.bienId,
      compraId: data.compraId,
      usuarioId: req.usuario!.id,
    },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "Documento",
    entidadId: documento.id,
    datosNuevos: documento,
    ip: req.ip,
  });

  res.status(201).json(documento);
});

documentosRouter.delete("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);

  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento) throw new HttpError(404, "Documento no encontrado");

  await prisma.documento.delete({ where: { id } });
  await eliminarArchivo(documento.archivoUrl);

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ELIMINAR",
    entidad: "Documento",
    entidadId: id,
    datosAnteriores: documento,
    ip: req.ip,
  });

  res.status(204).send();
});
