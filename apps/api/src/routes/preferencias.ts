import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  CONFIGURACION_ETIQUETA_DEFAULT,
  configuracionEtiquetaSchema,
} from "../lib/configuracionEtiqueta.js";
import { requireAuth } from "../middleware/auth.js";

export const preferenciasRouter = Router();

preferenciasRouter.use(requireAuth);

preferenciasRouter.get("/etiqueta", async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario!.id },
    select: { configuracionEtiqueta: true },
  });

  const configuracion = configuracionEtiquetaSchema.safeParse(
    usuario?.configuracionEtiqueta,
  );

  res.json(
    configuracion.success
      ? configuracion.data
      : CONFIGURACION_ETIQUETA_DEFAULT,
  );
});

preferenciasRouter.put("/etiqueta", async (req, res) => {
  const data = configuracionEtiquetaSchema.parse(req.body);

  const usuario = await prisma.usuario.update({
    where: { id: req.usuario!.id },
    data: { configuracionEtiqueta: data },
    select: { configuracionEtiqueta: true },
  });

  res.json(usuario.configuracionEtiqueta);
});
