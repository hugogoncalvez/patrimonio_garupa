import { prisma } from "./prisma.js";
import { HttpError } from "./http.js";
import type { Organismo, Prisma } from "../generated/prisma/client.js";

const PREFIJO: Record<Organismo, string> = {
  DE: "1",
  HCD: "2",
};

const ORGANISMO: Record<string, Organismo> = {
  "1": "DE",
  "2": "HCD",
};

type ClienteBd = typeof prisma | Prisma.TransactionClient;

type RubroCodigo = {
  id: number;
  nombre: string;
  activo: boolean;
  codigoCategoria: number;
};

export interface CodigoInterpretado {
  organismo: Organismo;
  codigoCategoria: number;
  numero: number;
}

export interface ProximoCodigo {
  codigo: string;
  organismo: Organismo;
  rubroId: number;
  codigoCategoria: number;
}

function formatearCodigo(
  organismo: Organismo,
  codigoCategoria: number,
  numero: number,
) {
  return `${PREFIJO[organismo]}-${codigoCategoria}-${numero}`;
}

export function interpretarCodigo(codigo: string): CodigoInterpretado | null {
  const [prefijo, categoria, numero, extra] = codigo.trim().split("-");

  if (!prefijo || !categoria || !numero || extra !== undefined) return null;
  if (!/^[12]$/.test(prefijo)) return null;
  if (!/^\d+$/.test(categoria) || !/^\d+$/.test(numero)) return null;

  const codigoCategoria = Number(categoria);
  const numeroCodigo = Number(numero);

  if (!Number.isSafeInteger(codigoCategoria) || codigoCategoria <= 0) {
    return null;
  }
  if (!Number.isSafeInteger(numeroCodigo) || numeroCodigo <= 0) return null;

  return {
    organismo: ORGANISMO[prefijo],
    codigoCategoria,
    numero: numeroCodigo,
  };
}

async function obtenerRubroParaCodigo(
  db: ClienteBd,
  rubroId: number,
): Promise<RubroCodigo> {
  const rubro = await db.rubro.findUnique({
    where: { id: rubroId },
    select: {
      id: true,
      nombre: true,
      activo: true,
      codigoCategoria: true,
    },
  });

  if (!rubro) {
    throw new HttpError(404, "Rubro no encontrado");
  }

  if (!rubro.activo) {
    throw new HttpError(400, `El rubro "${rubro.nombre}" está inactivo`);
  }

  if (!rubro.codigoCategoria) {
    throw new HttpError(
      400,
      `El rubro "${rubro.nombre}" no tiene código de categoría para generar el código de inventario`,
    );
  }

  return {
    ...rubro,
    codigoCategoria: rubro.codigoCategoria,
  };
}

async function obtenerMaximoExistente(
  db: ClienteBd,
  organismo: Organismo,
  codigoCategoria: number,
) {
  const prefijo = PREFIJO[organismo];
  const bienes = await db.bien.findMany({
    where: {
      codigoInventario: {
        startsWith: `${prefijo}-${codigoCategoria}-`,
      },
    },
    select: { codigoInventario: true },
  });

  return bienes.reduce((maximo, bien) => {
    const interpretado = interpretarCodigo(bien.codigoInventario);

    if (
      interpretado &&
      interpretado.organismo === organismo &&
      interpretado.codigoCategoria === codigoCategoria
    ) {
      return Math.max(maximo, interpretado.numero);
    }

    return maximo;
  }, 0);
}

export async function previsualizarCodigoBien(
  organismo: Organismo,
  rubroId: number,
): Promise<ProximoCodigo> {
  const rubro = await obtenerRubroParaCodigo(prisma, rubroId);
  const maximo = await obtenerMaximoExistente(
    prisma,
    organismo,
    rubro.codigoCategoria,
  );
  const contador = await prisma.contadorBien.findUnique({
    where: {
      organismo_rubroId: { organismo, rubroId },
    },
    select: { ultimoNumero: true },
  });
  const ultimo = Math.max(maximo, contador?.ultimoNumero ?? 0);

  return {
    codigo: formatearCodigo(organismo, rubro.codigoCategoria, ultimo + 1),
    organismo,
    rubroId,
    codigoCategoria: rubro.codigoCategoria,
  };
}

export async function reservarCodigosBien(
  tx: Prisma.TransactionClient,
  organismo: Organismo,
  rubroId: number,
  cantidad: number,
) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    throw new HttpError(400, "La cantidad de códigos debe ser un entero positivo");
  }

  const rubro = await obtenerRubroParaCodigo(tx, rubroId);
  const maximo = await obtenerMaximoExistente(
    tx,
    organismo,
    rubro.codigoCategoria,
  );
  const [contador] = await tx.$queryRaw<{ ultimoNumero: number }[]>`
    INSERT INTO "ContadorBien" ("organismo", "rubroId", "ultimoNumero", "updatedAt")
    VALUES (${organismo}::"Organismo", ${rubroId}, ${maximo + cantidad}, NOW())
    ON CONFLICT ("organismo", "rubroId")
    DO UPDATE SET
      "ultimoNumero" = GREATEST("ContadorBien"."ultimoNumero", ${maximo}) + ${cantidad},
      "updatedAt" = NOW()
    RETURNING "ultimoNumero"
  `;
  const inicio = contador.ultimoNumero - cantidad + 1;

  return Array.from({ length: cantidad }, (_, indice) =>
    formatearCodigo(
      organismo,
      rubro.codigoCategoria,
      inicio + indice,
    ),
  );
}

export async function generarCodigoBien(
  tx: Prisma.TransactionClient,
  organismo: Organismo,
  rubroId: number,
) {
  const [codigo] = await reservarCodigosBien(tx, organismo, rubroId, 1);
  return codigo;
}

export async function sincronizarContadorCodigoManual(
  tx: Prisma.TransactionClient,
  codigo: string,
  organismo: Organismo,
  rubroId: number,
) {
  const interpretado = interpretarCodigo(codigo);
  if (!interpretado) return;

  if (interpretado.organismo !== organismo) {
    throw new HttpError(
      400,
      "El código de inventario no corresponde al organismo seleccionado",
    );
  }

  const rubroCodigo = await tx.rubro.findUnique({
    where: { codigoCategoria: interpretado.codigoCategoria },
    select: { id: true, nombre: true },
  });

  if (rubroCodigo && rubroCodigo.id !== rubroId) {
    throw new HttpError(
      400,
      `El código de inventario corresponde al rubro "${rubroCodigo.nombre}"`,
    );
  }

  if (!rubroCodigo) return;

  await tx.$queryRaw`
    INSERT INTO "ContadorBien" ("organismo", "rubroId", "ultimoNumero", "updatedAt")
    VALUES (
      ${interpretado.organismo}::"Organismo",
      ${rubroCodigo.id},
      ${interpretado.numero},
      NOW()
    )
    ON CONFLICT ("organismo", "rubroId")
    DO UPDATE SET
      "ultimoNumero" = GREATEST("ContadorBien"."ultimoNumero", ${interpretado.numero}),
      "updatedAt" = NOW()
  `;
}
