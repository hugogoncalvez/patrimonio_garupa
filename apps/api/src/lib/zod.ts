import { z } from "zod";

export const idParam = z.coerce.number().int().positive();

export const textoOpcional = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

export const idOpcional = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().int().positive().nullable().optional(),
);

export const numeroOpcional = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().nullable().optional(),
);

export const fechaOpcional = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.date().nullable().optional(),
);
