import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { idOpcional, idParam, textoOpcional } from "../lib/zod.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const catalogosRouter = Router();

catalogosRouter.use(requireAuth);
catalogosRouter.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    next();
    return;
  }
  requireRole("CONTABLE")(req, res, next);
});

const codigoCategoriaOpcional = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().int().min(1).max(7).nullable().optional(),
);

const familiaBienSchema = z.enum([
  "INMUEBLE",
  "MUEBLE",
  "MAQUINARIA",
  "VEHICULO",
  "MAQUINARIA_VIAL",
  "BIBLIOTECA",
  "OTRO",
]);

const rubroSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  codigoInterno: textoOpcional(30),
  codigoCuenta: textoOpcional(30),
  codigoCategoria: codigoCategoriaOpcional,
  familia: familiaBienSchema.optional(),
  activo: z.boolean().optional(),
});

const estadoSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  activo: z.boolean().optional(),
});

const categoriaConsumibleSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  activo: z.boolean().optional(),
});

const areaSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  direccion: textoOpcional(200),
  responsableId: idOpcional,
  activo: z.boolean().optional(),
});

const personaSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellido: z.string().trim().min(1).max(100),
  dni: textoOpcional(20),
  cargo: textoOpcional(120),
  areaId: idOpcional,
  activo: z.boolean().optional(),
});

catalogosRouter.get("/tipos", (_req, res) => {
  res.json({
    tiposIncorporacion: [
      "COMPRA",
      "DONACION",
      "TRANSFERENCIA",
      "PRESTAMO",
      "OTRO",
    ],
    tiposDocumento: ["FACTURA", "REMITO", "ACTA", "RESOLUCION", "OTRO"],
    estadosBienSugeridos: [
      "En uso",
      "En desuso",
      "En reparación",
      "En depósito",
      "Prestado",
      "Dado de baja",
    ],
    familiasBien: [
      "INMUEBLE",
      "MUEBLE",
      "MAQUINARIA",
      "VEHICULO",
      "MAQUINARIA_VIAL",
      "BIBLIOTECA",
      "OTRO",
    ],
    situacionesInmueble: [
      "OCUPADO",
      "DESOCUPADO",
      "ALQUILADO",
      "CEDIDO_COMODATO",
      "EN_LITIGIO",
      "OTRO",
    ],
  });
});

catalogosRouter.get("/rubros", async (_req, res) => {
  const rubros = await prisma.rubro.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { bienes: true } } },
  });
  res.json(rubros);
});

catalogosRouter.post("/rubros", async (req, res) => {
  const data = rubroSchema.parse(req.body);

  if (data.codigoCategoria) {
    const existente = await prisma.rubro.findUnique({
      where: { codigoCategoria: data.codigoCategoria },
    });
    if (existente) {
      throw new HttpError(
        409,
        `El código de categoría ${data.codigoCategoria} ya está asignado a "${existente.nombre}"`,
      );
    }
  }

  const creado = await prisma.rubro.create({ data });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "Rubro",
    entidadId: creado.id,
    datosNuevos: creado,
    ip: req.ip,
  });

  res.status(201).json(creado);
});

catalogosRouter.patch("/rubros/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = rubroSchema.partial().parse(req.body);
  const anterior = await prisma.rubro.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Rubro no encontrado");
  }

  if (data.codigoCategoria) {
    const existente = await prisma.rubro.findUnique({
      where: { codigoCategoria: data.codigoCategoria },
    });
    if (existente && existente.id !== id) {
      throw new HttpError(
        409,
        `El código de categoría ${data.codigoCategoria} ya está asignado a "${existente.nombre}"`,
      );
    }
  }

  const actualizado = await prisma.rubro.update({ where: { id }, data });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "Rubro",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.delete("/rubros/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const anterior = await prisma.rubro.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Rubro no encontrado");
  }

  const actualizado = await prisma.rubro.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ELIMINAR",
    entidad: "Rubro",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.get("/estados", async (_req, res) => {
  const estados = await prisma.estadoBien.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { bienes: true } } },
  });
  res.json(estados);
});

catalogosRouter.post("/estados", async (req, res) => {
  const data = estadoSchema.parse(req.body);
  const creado = await prisma.estadoBien.create({ data });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "EstadoBien",
    entidadId: creado.id,
    datosNuevos: creado,
    ip: req.ip,
  });

  res.status(201).json(creado);
});

catalogosRouter.patch("/estados/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = estadoSchema.partial().parse(req.body);
  const anterior = await prisma.estadoBien.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Estado no encontrado");
  }

  const actualizado = await prisma.estadoBien.update({ where: { id }, data });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "EstadoBien",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.delete("/estados/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const anterior = await prisma.estadoBien.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Estado no encontrado");
  }

  const actualizado = await prisma.estadoBien.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ELIMINAR",
    entidad: "EstadoBien",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});


catalogosRouter.get("/categorias-consumibles", async (_req, res) => {
  const categorias = await prisma.categoriaConsumible.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { consumibles: true } } },
  });
  res.json(categorias);
});

catalogosRouter.post("/categorias-consumibles", async (req, res) => {
  const data = categoriaConsumibleSchema.parse(req.body);
  const creado = await prisma.categoriaConsumible.create({ data });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "CategoriaConsumible",
    entidadId: creado.id,
    datosNuevos: creado,
    ip: req.ip,
  });

  res.status(201).json(creado);
});

catalogosRouter.patch("/categorias-consumibles/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = categoriaConsumibleSchema.partial().parse(req.body);
  const anterior = await prisma.categoriaConsumible.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Categoría no encontrada");
  }

  const actualizado = await prisma.categoriaConsumible.update({
    where: { id },
    data,
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "CategoriaConsumible",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.delete("/categorias-consumibles/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const anterior = await prisma.categoriaConsumible.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Categoría no encontrada");
  }

  const actualizado = await prisma.categoriaConsumible.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ELIMINAR",
    entidad: "CategoriaConsumible",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.get("/areas", async (_req, res) => {
  const areas = await prisma.area.findMany({
    orderBy: { nombre: "asc" },
    include: {
      responsable: { select: { id: true, nombre: true, apellido: true, dni: true } },
      _count: { select: { bienes: true, personas: true } },
    },
  });
  res.json(areas);
});

catalogosRouter.post("/areas", async (req, res) => {
  const data = areaSchema.parse(req.body);
  const creado = await prisma.area.create({
    data,
    include: {
      responsable: { select: { id: true, nombre: true, apellido: true, dni: true } },
    },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "Area",
    entidadId: creado.id,
    datosNuevos: creado,
    ip: req.ip,
  });

  res.status(201).json(creado);
});

catalogosRouter.patch("/areas/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = areaSchema.partial().parse(req.body);
  const anterior = await prisma.area.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Área no encontrada");
  }

  const actualizado = await prisma.area.update({
    where: { id },
    data,
    include: {
      responsable: { select: { id: true, nombre: true, apellido: true, dni: true } },
    },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "Area",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.delete("/areas/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const anterior = await prisma.area.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Área no encontrada");
  }

  const actualizado = await prisma.area.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ELIMINAR",
    entidad: "Area",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.get("/personas", async (_req, res) => {
  const personas = await prisma.persona.findMany({
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    include: {
      area: { select: { id: true, nombre: true } },
      _count: { select: { bienes: true } },
    },
  });
  res.json(personas);
});

catalogosRouter.post("/personas", async (req, res) => {
  const data = personaSchema.parse(req.body);
  const creado = await prisma.persona.create({
    data,
    include: { area: { select: { id: true, nombre: true } } },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "CREAR",
    entidad: "Persona",
    entidadId: creado.id,
    datosNuevos: creado,
    ip: req.ip,
  });

  res.status(201).json(creado);
});

catalogosRouter.patch("/personas/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = personaSchema.partial().parse(req.body);
  const anterior = await prisma.persona.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Persona no encontrada");
  }

  const actualizado = await prisma.persona.update({
    where: { id },
    data,
    include: { area: { select: { id: true, nombre: true } } },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ACTUALIZAR",
    entidad: "Persona",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});

catalogosRouter.delete("/personas/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const anterior = await prisma.persona.findUnique({ where: { id } });

  if (!anterior) {
    throw new HttpError(404, "Persona no encontrada");
  }

  const actualizado = await prisma.persona.update({
    where: { id },
    data: { activo: false },
  });

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "ELIMINAR",
    entidad: "Persona",
    entidadId: id,
    datosAnteriores: anterior,
    datosNuevos: actualizado,
    ip: req.ip,
  });

  res.json(actualizado);
});
