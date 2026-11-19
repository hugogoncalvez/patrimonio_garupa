import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/", async (_req, res) => {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [
    totalBienes,
    bienesActivos,
    bienesBaja,
    totalConsumibles,
    consumiblesActivos,
    consumibles,
    comprasMes,
    ultimosStock,
    ultimasCustodias,
    ultimasUbicaciones,
    porRubro,
    porEstado,
    porArea,
    sinResponsable,
    sinUbicacion,
  ] = await Promise.all([
    prisma.bien.count(),
    prisma.bien.count({ where: { activo: true } }),
    prisma.bien.count({ where: { activo: false } }),
    prisma.consumible.count(),
    prisma.consumible.count({ where: { activo: true } }),
    prisma.consumible.findMany({ where: { activo: true } }),
    prisma.compra.count({ where: { fecha: { gte: inicioMes } } }),
    prisma.movimientoStock.findMany({
      take: 5,
      orderBy: { fecha: "desc" },
      include: {
        consumible: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    }),
    prisma.movimientoCustodia.findMany({
      take: 5,
      orderBy: { fecha: "desc" },
      include: {
        bien: { select: { id: true, codigoInventario: true, descripcion: true } },
        personaDestino: { select: { id: true, nombre: true, apellido: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    }),
    prisma.movimientoUbicacion.findMany({
      take: 5,
      orderBy: { fecha: "desc" },
      include: {
        bien: { select: { id: true, codigoInventario: true, descripcion: true } },
        areaDestino: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    }),
    prisma.bien.groupBy({
      by: ["rubroId"],
      where: { activo: true },
      _count: { _all: true },
    }),
    prisma.bien.groupBy({
      by: ["estadoId"],
      where: { activo: true },
      _count: { _all: true },
    }),
    prisma.bien.groupBy({
      by: ["areaId"],
      where: { activo: true },
      _count: { _all: true },
    }),
    prisma.bien.count({
      where: {
        activo: true,
        subresponsableId: null,
        OR: [{ areaId: null }, { area: { responsableId: null } }],
      },
    }),
    prisma.bien.count({ where: { activo: true, areaId: null } }),
  ]);

  const stockBajo = consumibles.filter(
    (item) => Number(item.stockActual) <= Number(item.stockMinimo),
  );

  const rubros = await prisma.rubro.findMany({
    where: { id: { in: porRubro.map((item) => item.rubroId) } },
    select: { id: true, nombre: true },
  });

  const estados = await prisma.estadoBien.findMany({
    where: { id: { in: porEstado.map((item) => item.estadoId) } },
    select: { id: true, nombre: true },
  });

  const areas = await prisma.area.findMany({
    where: {
      id: { in: porArea.flatMap((item) => (item.areaId ? [item.areaId] : [])) },
    },
    select: { id: true, nombre: true },
  });

  const nombreRubro = new Map(rubros.map((item) => [item.id, item.nombre]));
  const nombreEstado = new Map(estados.map((item) => [item.id, item.nombre]));
  const nombreArea = new Map(areas.map((item) => [item.id, item.nombre]));

  const movimientos = [
    ...ultimosStock.map((item) => ({
      id: `stock-${item.id}`,
      categoria: "STOCK",
      descripcion: `${item.tipo} de ${item.consumible.nombre}`,
      fecha: item.fecha,
      usuario: item.usuario,
    })),
    ...ultimasCustodias.map((item) => ({
      id: `custodia-${item.id}`,
      categoria: "CUSTODIA",
      descripcion: `${item.tipo} de ${item.bien.codigoInventario} - ${item.bien.descripcion}`,
      fecha: item.fecha,
      usuario: item.usuario,
    })),
    ...ultimasUbicaciones.map((item) => ({
      id: `ubicacion-${item.id}`,
      categoria: "UBICACION",
      descripcion: `${item.tipo} de ${item.bien.codigoInventario} - ${item.bien.descripcion}`,
      fecha: item.fecha,
      usuario: item.usuario,
    })),
  ]
    .sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )
    .slice(0, 10);

  res.json({
    bienes: {
      total: totalBienes,
      activos: bienesActivos,
      baja: bienesBaja,
      sinResponsable,
      sinUbicacion,
    },
    consumibles: {
      total: totalConsumibles,
      activos: consumiblesActivos,
      stockBajo: stockBajo.length,
      detalleStockBajo: stockBajo.slice(0, 5).map((item) => ({
        id: item.id,
        nombre: item.nombre,
        stockActual: item.stockActual,
        stockMinimo: item.stockMinimo,
        unidadMedida: item.unidadMedida,
      })),
    },
    comprasMes,
    bienesPorRubro: porRubro
      .map((item) => ({
        rubroId: item.rubroId,
        nombre: nombreRubro.get(item.rubroId) ?? "Sin rubro",
        cantidad: item._count._all,
      }))
      .sort((a, b) => b.cantidad - a.cantidad),
    bienesPorEstado: porEstado
      .map((item) => ({
        estadoId: item.estadoId,
        nombre: nombreEstado.get(item.estadoId) ?? "Sin estado",
        cantidad: item._count._all,
      }))
      .sort((a, b) => b.cantidad - a.cantidad),
    bienesPorArea: porArea
      .map((item) => ({
        areaId: item.areaId,
        nombre: item.areaId
          ? (nombreArea.get(item.areaId) ?? "Área eliminada")
          : "Sin área",
        cantidad: item._count._all,
      }))
      .sort((a, b) => b.cantidad - a.cantidad),
    movimientosRecientes: movimientos,
  });
});
