import { prisma } from "./prisma.js";
import { HttpError } from "./http.js";
import type { FamiliaBien, Prisma } from "../generated/prisma/client.js";

type ClienteBd = typeof prisma | Prisma.TransactionClient;

const CAMPOS_OBLIGATORIOS: Record<FamiliaBien, string[]> = {
  INMUEBLE: [],
  MUEBLE: [],
  MAQUINARIA: ["marca", "modelo", "numeroSerie"],
  VEHICULO: ["marca", "modelo", "numeroSerie", "patente"],
  MAQUINARIA_VIAL: ["marca", "modelo", "numeroSerie", "patente"],
  BIBLIOTECA: [],
  OTRO: [],
};

const ETIQUETAS: Record<string, string> = {
  marca: "Marca",
  modelo: "Modelo",
  numeroSerie: "N° de serie",
  patente: "Patente",
};

export const ESTADOS_INMUEBLE = [
  "En uso",
  "En desuso",
  "En reparación",
  "Dado de baja",
] as const;

const CAMPOS_GENERICOS = [
  "marca",
  "modelo",
  "numeroSerie",
  "numeroMotor",
  "patente",
  "material",
  "medidas",
  "color",
];

export const CAMPOS_INMUEBLE = [
  "situacionInmueble",
  "tipoInmueble",
  "domicilioInmueble",
  "localidadInmueble",
  "provinciaInmueble",
  "codigoPostalInmueble",
  "partidaInmobiliaria",
  "nomenclaturaCatastral",
  "matriculaInmobiliaria",
  "superficieTerreno",
  "superficieCubierta",
  "destinoInmueble",
  "fechaEscritura",
  "numeroEscritura",
  "notaria",
];

const CAMPOS_VISIBLES: Record<FamiliaBien, string[]> = {
  INMUEBLE: CAMPOS_INMUEBLE,
  MUEBLE: ["marca", "modelo", "numeroSerie", "material", "medidas", "color"],
  MAQUINARIA: [
    "marca",
    "modelo",
    "numeroSerie",
    "numeroMotor",
    "material",
    "medidas",
    "color",
  ],
  VEHICULO: [
    "marca",
    "modelo",
    "numeroSerie",
    "numeroMotor",
    "patente",
    "color",
  ],
  MAQUINARIA_VIAL: [
    "marca",
    "modelo",
    "numeroSerie",
    "numeroMotor",
    "patente",
    "material",
    "medidas",
    "color",
  ],
  BIBLIOTECA: ["material", "medidas"],
  OTRO: CAMPOS_GENERICOS,
};

const CAMPOS_ESPECIFICOS = [
  ...new Set([...CAMPOS_GENERICOS, ...CAMPOS_INMUEBLE]),
];

export function validarCamposObligatoriosFamilia(
  familia: FamiliaBien,
  data: Record<string, unknown>,
) {
  const faltantes = CAMPOS_OBLIGATORIOS[familia].filter((campo) => {
    const valor = data[campo];
    return valor === null || valor === undefined || String(valor).trim() === "";
  });

  if (faltantes.length > 0) {
    const etiquetas = faltantes.map((campo) => ETIQUETAS[campo] ?? campo);
    throw new HttpError(
      400,
      `Para este rubro son obligatorios: ${etiquetas.join(", ")}`,
    );
  }
}

export async function validarEstadoFamilia(
  db: ClienteBd,
  familia: FamiliaBien,
  estadoId: number,
) {
  if (familia !== "INMUEBLE") return;

  const estado = await db.estadoBien.findUnique({
    where: { id: estadoId },
    select: { nombre: true },
  });

  if (!estado) {
    throw new HttpError(400, "Estado del bien no encontrado");
  }

  if (!ESTADOS_INMUEBLE.includes(estado.nombre as (typeof ESTADOS_INMUEBLE)[number])) {
    throw new HttpError(
      400,
      `Para inmuebles el estado debe ser: ${ESTADOS_INMUEBLE.join(", ")}`,
    );
  }
}

export function limpiarCamposNoVisibles<T extends Record<string, unknown>>(
  familia: FamiliaBien,
  data: T,
): T {
  const visibles = new Set(CAMPOS_VISIBLES[familia]);

  for (const campo of CAMPOS_ESPECIFICOS) {
    if (!visibles.has(campo)) {
      (data as Record<string, unknown>)[campo] = null;
    }
  }

  return data;
}
