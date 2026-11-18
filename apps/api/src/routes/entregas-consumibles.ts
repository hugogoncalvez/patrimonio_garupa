import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { idParam, textoOpcional } from "../lib/zod.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  anularEntregaConsumible,
  crearEntregaConsumible,
} from "../lib/entregas.js";
import { generarActaEntregaPdf } from "../lib/acta-entrega-pdf.js";

export const entregasConsumiblesRouter = Router();

entregasConsumiblesRouter.use(requireAuth);

const itemSchema = z.object({
  consumibleId: idParam,
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a cero").max(999999999),
});

const crearSchema = z
  .object({
    fecha: z.coerce.date().optional(),
    areaDestinoId: idParam,
    firmanteNombre: z
      .string()
      .trim()
      .min(3, "Ingresá el nombre del firmante")
      .max(150),
    firmanteDni: z
      .string()
      .trim()
      .transform((value) => value.replace(/\D/g, ""))
      .refine((value) => /^\d{7,8}$/.test(value), {
        message: "El DNI debe tener 7 u 8 dígitos",
      }),
    observaciones: textoOpcional(2000),
    items: z
      .array(itemSchema)
      .min(1, "Agregá al menos un consumible")
      .max(100, "Máximo 100 consumibles por entrega"),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<number>();
    data.items.forEach((item, index) => {
      if (ids.has(item.consumibleId)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "consumibleId"],
          message: "El consumible está repetido",
        });
      }
      ids.add(item.consumibleId);
    });
  });

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  areaId: idParam.optional(),
  estado: z.enum(["REGISTRADA", "ANULADA"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const anularSchema = z.object({
  motivo: z.string().trim().min(5, "Indicá el motivo de anulación").max(500),
});

const incluirEntrega = {
  areaDestino: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true, apellido: true } },
  anuladaPor: { select: { id: true, nombre: true, apellido: true } },
  movimientos: {
    orderBy: { orden: "asc" as const },
    include: {
      consumible: {
        select: {
          id: true,
          nombre: true,
          categoria: { select: { id: true, nombre: true } },
          unidadMedida: true,
        },
      },
    },
  },
};

entregasConsumiblesRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where: Record<string, unknown> = {};

  if (query.areaId) where.areaDestinoId = query.areaId;
  if (query.estado) where.estado = query.estado;
  if (query.q) {
    where.OR = [
      { numero: { contains: query.q, mode: "insensitive" } },
      { firmanteNombre: { contains: query.q, mode: "insensitive" } },
      { areaNombreSnapshot: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.entregaConsumible.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        areaDestino: { select: { id: true, nombre: true } },
        _count: { select: { movimientos: true } },
      },
    }),
    prisma.entregaConsumible.count({ where }),
  ]);

  res.json({
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
});

entregasConsumiblesRouter.post("/", async (req, res) => {
  const data = crearSchema.parse(req.body);

  const entrega = await crearEntregaConsumible({
    fecha: data.fecha ?? new Date(),
    areaDestinoId: data.areaDestinoId,
    firmanteNombre: data.firmanteNombre,
    firmanteDni: data.firmanteDni,
    observaciones: data.observaciones,
    items: data.items,
    usuarioId: req.usuario!.id,
    usuarioNombre: `${req.usuario!.apellido}, ${req.usuario!.nombre}.`,
    ip: req.ip,
  });

  res.status(201).json(entrega);
});

entregasConsumiblesRouter.get("/:id/acta.pdf", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const entrega = await prisma.entregaConsumible.findUnique({
    where: { id },
    include: incluirEntrega,
  });

  if (!entrega) {
    throw new HttpError(404, "Entrega no encontrada");
  }

  const pdf = await generarActaEntregaPdf(entrega);

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "IMPRIMIR",
    entidad: "EntregaConsumible",
    entidadId: id,
    ip: req.ip,
  });

  const descargar = req.query.descargar === "1";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Content-Disposition",
    `${descargar ? "attachment" : "inline"}; filename="${entrega.numero}.pdf"`,
  );
  res.send(Buffer.from(pdf));
});

entregasConsumiblesRouter.post("/:id/anular", requireRole("CONTABLE"), async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { motivo } = anularSchema.parse(req.body);

  const entrega = await anularEntregaConsumible(
    id,
    motivo,
    req.usuario!.id,
    req.ip,
  );

  res.json(entrega);
});

entregasConsumiblesRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const entrega = await prisma.entregaConsumible.findUnique({
    where: { id },
    include: incluirEntrega,
  });

  if (!entrega) {
    throw new HttpError(404, "Entrega no encontrada");
  }

  res.json(entrega);
});
