import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http.js";
import { registrarAuditoria } from "../lib/audit.js";
import { generarActaRecepcionPdf } from "../lib/acta-recepcion-pdf.js";
import { reservarCodigosBien } from "../lib/codigos-bien.js";
import {
  fechaOpcional,
  idOpcional,
  idParam,
  numeroOpcional,
  textoOpcional,
} from "../lib/zod.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const comprasRouter = Router();

comprasRouter.use(requireAuth);

const compraInclude = {
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  areaDestino: { select: { id: true, nombre: true } },
  proveedorDatos: {
    select: {
      id: true,
      nombre: true,
      cuit: true,
      telefono: true,
      email: true,
      direccion: true,
    },
  },
  comprobantes: { orderBy: { id: "asc" as const } },
  detalles: {
    include: {
      rubro: {
        select: {
          id: true,
          nombre: true,
          codigoCategoria: true,
          codigoCuenta: true,
          familia: true,
        },
      },
      consumible: {
        select: { id: true, nombre: true, unidadMedida: true },
      },
      bienes: {
        select: {
          id: true,
          codigoInventario: true,
          descripcion: true,
          estado: { select: { id: true, nombre: true } },
        },
      },
    },
  },
  actasRecepcion: {
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      numero: true,
      fecha: true,
      observaciones: true,
      usuario: { select: { id: true, nombre: true, apellido: true } },
    },
  },
  documentos: true,
} as const;

const comprobanteSchema = z.object({
  tipo: z.string().trim().min(1, "El tipo de comprobante es obligatorio").max(50),
  numero: textoOpcional(60),
  fecha: fechaOpcional,
});

const detalleSchema = z
  .object({
    tipo: z.enum(["INVENTARIABLE", "CONSUMIBLE"]),
    rubroId: idOpcional,
    consumibleId: idOpcional,
    cantidad: z.coerce.number().positive("La cantidad debe ser mayor a cero"),
    precioUnitario: numeroOpcional,
    descripcion: textoOpcional(250),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "INVENTARIABLE") {
      if (!data.rubroId) {
        ctx.addIssue({
          code: "custom",
          path: ["rubroId"],
          message: "Seleccioná la categoría contable del bien",
        });
      }
      if (!data.descripcion) {
        ctx.addIssue({
          code: "custom",
          path: ["descripcion"],
          message: "La descripción del bien es obligatoria",
        });
      }
      if (!Number.isInteger(data.cantidad)) {
        ctx.addIssue({
          code: "custom",
          path: ["cantidad"],
          message: "La cantidad de bienes debe ser un número entero",
        });
      }
      return;
    }

    if (!data.consumibleId) {
      ctx.addIssue({
        code: "custom",
        path: ["consumibleId"],
        message: "Seleccioná un consumible",
      });
    }
    if (data.rubroId) {
      ctx.addIssue({
        code: "custom",
        path: ["rubroId"],
        message: "Un consumible no lleva categoría de bien",
      });
    }
  });

const compraSchema = z
  .object({
    fecha: z.coerce.date(),
    organismo: z.enum(["DE", "HCD"]),
    numeroOrdenPago: textoOpcional(40),
    areaDestinoId: idOpcional,
    proveedorId: idOpcional,
    proveedor: textoOpcional(150),
    observaciones: textoOpcional(2000),
    comprobantes: z.array(comprobanteSchema).default([]),
    detalles: z.array(detalleSchema).min(1, "Agregá al menos un detalle"),
  })
  .refine((data) => data.proveedorId || data.proveedor, {
    message: "Seleccioná o ingresá un proveedor",
    path: ["proveedorId"],
  });

const actaSchema = z.object({
  fecha: z.coerce.date(),
  observaciones: textoOpcional(2000),
  items: z
    .array(
      z.object({
        compraDetalleId: z.coerce.number().int().positive(),
        cantidad: z.coerce.number().positive("La cantidad debe ser mayor a cero"),
      }),
    )
    .min(1, "Seleccioná al menos un ítem para recibir"),
});

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  organismo: z.enum(["DE", "HCD"]).optional(),
  estado: z.enum(["REGISTRADA", "RECIBIDA_PARCIAL", "RECIBIDA"]).optional(),
  areaId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function numeroActaRecepcion(ejercicio: number, numero: number) {
  return `AR-${ejercicio}-${String(numero).padStart(6, "0")}`;
}

function entero(valor: { toString(): string }) {
  return Number(valor.toString());
}

comprasRouter.get("/", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where: any = {};

  if (query.q) {
    where.OR = [
      { proveedor: { contains: query.q, mode: "insensitive" } },
      { proveedorDatos: { nombre: { contains: query.q, mode: "insensitive" } } },
      { numeroOrdenPago: { contains: query.q, mode: "insensitive" } },
      {
        comprobantes: {
          some: { numero: { contains: query.q, mode: "insensitive" } },
        },
      },
    ];
  }

  if (query.organismo) where.organismo = query.organismo;
  if (query.estado) where.estado = query.estado;
  if (query.areaId) where.areaDestinoId = query.areaId;

  const [items, total] = await Promise.all([
    prisma.compra.findMany({
      where,
      include: compraInclude,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.compra.count({ where }),
  ]);

  res.json({
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  });
});

comprasRouter.post("/", requireRole("CONTABLE"), async (req, res) => {
  const data = compraSchema.parse(req.body);

  const creada = await prisma.$transaction(async (tx) => {
    let proveedorNombre = data.proveedor;

    if (data.proveedorId) {
      const proveedor = await tx.proveedor.findUnique({
        where: { id: data.proveedorId },
      });
      if (!proveedor || !proveedor.activo) {
        throw new HttpError(404, "El proveedor seleccionado no está disponible");
      }
      proveedorNombre = proveedor.nombre;
    }

    for (const detalle of data.detalles) {
      if (detalle.tipo === "INVENTARIABLE") {
        const rubro = await tx.rubro.findUnique({
          where: { id: detalle.rubroId! },
        });
        if (!rubro || !rubro.activo) {
          throw new HttpError(400, "La categoría del bien no está disponible");
        }
        if (!rubro.codigoCategoria) {
          throw new HttpError(
            400,
            `El rubro "${rubro.nombre}" no tiene código de categoría configurado`,
          );
        }
      }

      if (detalle.tipo === "CONSUMIBLE") {
        const consumible = await tx.consumible.findUnique({
          where: { id: detalle.consumibleId! },
        });
        if (!consumible || !consumible.activo) {
          throw new HttpError(400, "El consumible seleccionado no está disponible");
        }
      }
    }

    const compra = await tx.compra.create({
      data: {
        fecha: data.fecha,
        organismo: data.organismo,
        numeroOrdenPago: data.numeroOrdenPago,
        areaDestinoId: data.areaDestinoId,
        proveedorId: data.proveedorId,
        proveedor: proveedorNombre,
        observaciones: data.observaciones,
        creadoPorId: req.usuario!.id,
        comprobantes: {
          create: data.comprobantes.map((comprobante) => ({
            tipo: comprobante.tipo,
            numero: comprobante.numero,
            fecha: comprobante.fecha,
          })),
        },
        detalles: {
          create: data.detalles.map((detalle) => ({
            tipo: detalle.tipo,
            rubroId: detalle.tipo === "INVENTARIABLE" ? detalle.rubroId : null,
            consumibleId:
              detalle.tipo === "CONSUMIBLE" ? detalle.consumibleId : null,
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precioUnitario,
            descripcion: detalle.descripcion,
          })),
        },
      },
      include: compraInclude,
    });

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "CREAR",
      entidad: "Compra",
      entidadId: compra.id,
      datosNuevos: compra,
      ip: req.ip,
    });

    return compra;
  });

  res.status(201).json(creada);
});

comprasRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);

  const compra = await prisma.compra.findUnique({
    where: { id },
    include: {
      ...compraInclude,
      actasRecepcion: {
        orderBy: { id: "asc" },
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true } },
          detalles: {
            include: {
              compraDetalle: {
                select: {
                  id: true,
                  descripcion: true,
                  tipo: true,
                  rubro: {
                    select: { id: true, nombre: true, familia: true },
                  },
                  consumible: { select: { id: true, nombre: true } },
                },
              },
              bienes: {
                select: {
                  id: true,
                  codigoInventario: true,
                  descripcion: true,
                },
              },
            },
          },
        },
      },
      movimientosStock: {
        include: {
          consumible: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  if (!compra) {
    throw new HttpError(404, "Compra no encontrada");
  }

  res.json(compra);
});

comprasRouter.get("/:compraId/actas/:actaId/acta.pdf", async (req, res) => {
  const compraId = idParam.parse(req.params.compraId);
  const actaId = idParam.parse(req.params.actaId);

  const acta = await prisma.actaRecepcion.findFirst({
    where: { id: actaId, compraId },
    include: {
      usuario: { select: { nombre: true, apellido: true } },
      compra: {
        include: {
          proveedorDatos: { select: { nombre: true, cuit: true } },
          comprobantes: { orderBy: { id: "asc" } },
        },
      },
      detalles: {
        orderBy: { id: "asc" },
        include: {
          compraDetalle: {
            include: {
              rubro: { select: { nombre: true } },
              consumible: { select: { nombre: true, unidadMedida: true } },
            },
          },
          bienes: {
            orderBy: { codigoInventario: "asc" },
            select: { codigoInventario: true, descripcion: true },
          },
        },
      },
    },
  });

  if (!acta) {
    throw new HttpError(404, "Acta de recepción no encontrada");
  }

  const pdf = await generarActaRecepcionPdf(acta);

  await registrarAuditoria(prisma, {
    usuarioId: req.usuario!.id,
    accion: "IMPRIMIR",
    entidad: "ActaRecepcion",
    entidadId: acta.id,
    ip: req.ip,
  });

  const descargar = req.query.descargar === "1";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader(
    "Content-Disposition",
    `${descargar ? "attachment" : "inline"}; filename="${acta.numero}.pdf"`,
  );
  res.send(Buffer.from(pdf));
});

comprasRouter.post("/:id/actas", requireRole("CONTABLE", "PATRIMONIO"), async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = actaSchema.parse(req.body);

  const acta = await prisma.$transaction(async (tx) => {
    const compra = await tx.compra.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            rubro: true,
            consumible: true,
          },
        },
      },
    });

    if (!compra) {
      throw new HttpError(404, "Compra no encontrada");
    }
    if (compra.estado === "RECIBIDA") {
      throw new HttpError(400, "La compra ya fue recibida por completo");
    }

    const detallesPorId = new Map(
      compra.detalles.map((detalle) => [detalle.id, detalle]),
    );

    const cantidades = new Map<number, number>();
    for (const item of data.items) {
      const detalle = detallesPorId.get(item.compraDetalleId);
      if (!detalle) {
        throw new HttpError(
          400,
          `El ítem ${item.compraDetalleId} no pertenece a esta compra`,
        );
      }
      if (detalle.tipo === "INVENTARIABLE" && !Number.isInteger(item.cantidad)) {
        throw new HttpError(
          400,
          "La cantidad recibida de bienes debe ser un número entero",
        );
      }
      const acumulada =
        (cantidades.get(detalle.id) ?? 0) + item.cantidad;
      if (acumulada > entero(detalle.cantidad) - entero(detalle.cantidadRecibida)) {
        throw new HttpError(
          400,
          `La cantidad recibida supera lo pendiente en "${detalle.descripcion ?? detalle.consumible?.nombre ?? "ítem"}"`,
        );
      }
      cantidades.set(detalle.id, acumulada);
    }

    const estadosBien = await tx.estadoBien.findMany({
      where: {
        nombre: { in: ["En depósito", "En desuso"] },
        activo: true,
      },
      select: { id: true, nombre: true },
    });
    const estadoDeposito = estadosBien.find(
      (estado) => estado.nombre === "En depósito",
    );
    const estadoDesuso = estadosBien.find(
      (estado) => estado.nombre === "En desuso",
    );

    const detallesInventariables = compra.detalles.filter(
      (detalle) => detalle.tipo === "INVENTARIABLE",
    );
    const hayInmuebles = detallesInventariables.some(
      (detalle) => detalle.rubro?.familia === "INMUEBLE",
    );
    const hayOtrosBienes = detallesInventariables.some(
      (detalle) => detalle.rubro?.familia !== "INMUEBLE",
    );

    if (hayOtrosBienes && !estadoDeposito) {
      throw new HttpError(
        400,
        'No existe el estado "En depósito" para dar de alta los bienes',
      );
    }

    if (hayInmuebles && !estadoDesuso) {
      throw new HttpError(
        400,
        'No existe el estado "En desuso" para dar de alta los inmuebles',
      );
    }

    const ejercicio = data.fecha.getUTCFullYear();
    const contador = await tx.contadorActaRecepcion.upsert({
      where: { ejercicio },
      create: { ejercicio, ultimoNumero: 1 },
      update: { ultimoNumero: { increment: 1 } },
      select: { ultimoNumero: true },
    });

    const numero = numeroActaRecepcion(ejercicio, contador.ultimoNumero);
    const creada = await tx.actaRecepcion.create({
      data: {
        numero,
        fecha: data.fecha,
        organismo: compra.organismo,
        compraId: compra.id,
        usuarioId: req.usuario!.id,
        observaciones: data.observaciones,
      },
    });

    for (const [indice, item] of data.items.entries()) {
      const detalle = detallesPorId.get(item.compraDetalleId)!;
      const detalleActa = await tx.actaRecepcionDetalle.create({
        data: {
          actaRecepcionId: creada.id,
          compraDetalleId: detalle.id,
          cantidad: item.cantidad,
        },
      });

      if (detalle.tipo === "INVENTARIABLE") {
        const esInmueble = detalle.rubro?.familia === "INMUEBLE";
        const estadoBien = esInmueble ? estadoDesuso : estadoDeposito;
        const codigos = await reservarCodigosBien(
          tx,
          compra.organismo,
          detalle.rubroId!,
          item.cantidad,
        );

        for (const codigo of codigos) {
          await tx.bien.create({
            data: {
              organismo: compra.organismo,
              codigoInventario: codigo,
              descripcion: detalle.descripcion ?? "Bien sin descripción",
              rubroId: detalle.rubroId!,
              estadoId: estadoBien!.id,
              areaId: compra.areaDestinoId,
              tipoIncorporacion: "COMPRA",
              fechaAlta: data.fecha,
              valorHistorico: detalle.precioUnitario,
              numeroOrdenPago: compra.numeroOrdenPago,
              ejercicioAlta: ejercicio,
              observaciones: `Alta por Acta de Recepción ${numero}`,
              creadoPorId: req.usuario!.id,
              compraDetalleId: detalle.id,
              actaRecepcionId: creada.id,
              actaRecepcionDetalleId: detalleActa.id,
            },
          });
        }
      } else if (detalle.consumible) {
        if (!detalle.consumible.activo) {
          throw new HttpError(
            400,
            `El consumible "${detalle.consumible.nombre}" está inactivo`,
          );
        }

        await tx.consumible.update({
          where: { id: detalle.consumibleId! },
          data: { stockActual: { increment: item.cantidad } },
        });

        await tx.movimientoStock.create({
          data: {
            consumibleId: detalle.consumibleId!,
            tipo: "INGRESO",
            cantidad: item.cantidad,
            compraId: compra.id,
            usuarioId: req.usuario!.id,
            observaciones: `Recepción ${numero}`,
            nombreConsumibleSnapshot: detalle.consumible.nombre,
            unidadMedidaSnapshot: detalle.consumible.unidadMedida,
            orden: indice + 1,
            fecha: data.fecha,
          },
        });
      }

      await tx.compraDetalle.update({
        where: { id: detalle.id },
        data: { cantidadRecibida: { increment: item.cantidad } },
      });
    }

    const actualizados = await tx.compraDetalle.findMany({
      where: { compraId: compra.id },
      select: { cantidad: true, cantidadRecibida: true },
    });
    const completa = actualizados.every(
      (detalle) =>
        entero(detalle.cantidadRecibida) >= entero(detalle.cantidad),
    );

    await tx.compra.update({
      where: { id: compra.id },
      data: { estado: completa ? "RECIBIDA" : "RECIBIDA_PARCIAL" },
    });

    const resultado = await tx.actaRecepcion.findUniqueOrThrow({
      where: { id: creada.id },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true } },
        detalles: {
          include: {
            compraDetalle: {
              include: {
                rubro: { select: { id: true, nombre: true } },
                consumible: { select: { id: true, nombre: true } },
              },
            },
            bienes: {
              select: {
                id: true,
                codigoInventario: true,
                descripcion: true,
              },
            },
          },
        },
      },
    });

    await registrarAuditoria(tx, {
      usuarioId: req.usuario!.id,
      accion: "CREAR",
      entidad: "ActaRecepcion",
      entidadId: creada.id,
      datosNuevos: resultado,
      ip: req.ip,
    });

    return resultado;
  });

  res.status(201).json(acta);
});
