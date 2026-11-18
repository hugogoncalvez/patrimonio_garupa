import "dotenv/config";
import path from "node:path";
import express from "express";
import { z } from "zod";
import cors from "cors";
import { uploadsDir } from "./lib/storage.js";
import { authRouter } from "./routes/auth.js";
import { usuariosRouter } from "./routes/usuarios.js";
import { catalogosRouter } from "./routes/catalogos.js";
import { bienesRouter } from "./routes/bienes.js";
import { consumiblesRouter } from "./routes/consumibles.js";
import { proveedoresRouter } from "./routes/proveedores.js";
import { comprasRouter } from "./routes/compras.js";
import { documentosRouter } from "./routes/documentos.js";
import { entregasConsumiblesRouter } from "./routes/entregas-consumibles.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { auditoriaRouter } from "./routes/auditoria.js";
import { errorHandler, notFound } from "./middleware/error.js";

z.config(z.locales.es());

export const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((item) => item.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "2mb" }));
app.use(
  "/uploads",
  express.static(path.resolve(uploadsDir), {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "attachment");
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "patrimonio-api" });
});

app.use("/api/auth", authRouter);
app.use("/api/usuarios", usuariosRouter);
app.use("/api/catalogos", catalogosRouter);
app.use("/api/bienes", bienesRouter);
app.use("/api/consumibles", consumiblesRouter);
app.use("/api/proveedores", proveedoresRouter);
app.use("/api/compras", comprasRouter);
app.use("/api/documentos", documentosRouter);
app.use("/api/entregas-consumibles", entregasConsumiblesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/auditoria", auditoriaRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
