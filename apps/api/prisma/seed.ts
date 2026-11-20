import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import type { FamiliaBien } from "../src/generated/prisma/client.js";

type RubroSeed = {
  nombre: string;
  familia: FamiliaBien;
  codigoInterno: string;
  codigoCuenta?: string;
  codigoCategoria: number;
};

const rubros: RubroSeed[] = [
  {
    nombre: "INMUEBLES",
    familia: "INMUEBLE",
    codigoInterno: "INM",
    codigoCuenta: "5021008",
    codigoCategoria: 1,
  },
  {
    nombre: "MUEBLES Y UTILES",
    familia: "MUEBLE",
    codigoInterno: "MUE",
    codigoCuenta: "5021002",
    codigoCategoria: 2,
  },
  {
    nombre: "MAQUINAS MOTORES AP Y HERRAMIENTAS",
    familia: "MAQUINARIA",
    codigoInterno: "MAQ",
    codigoCuenta: "5021001",
    codigoCategoria: 3,
  },
  {
    nombre: "MEDIOS DE TRANSPORTE",
    familia: "VEHICULO",
    codigoInterno: "TRA",
    codigoCuenta: "5021005",
    codigoCategoria: 4,
  },
  {
    nombre: "MAQUINAS VIALES",
    familia: "MAQUINARIA_VIAL",
    codigoInterno: "MVI",
    codigoCuenta: "5021009",
    codigoCategoria: 5,
  },
  {
    nombre: "BIBLIOTECAS COLECC. Y AFINES",
    familia: "BIBLIOTECA",
    codigoInterno: "BIB",
    codigoCategoria: 6,
  },
  {
    nombre: "OTROS BIENES",
    familia: "OTRO",
    codigoInterno: "OTR",
    codigoCuenta: "5021010",
    codigoCategoria: 7,
  },
];

const estados = [
  "En uso",
  "En reparación",
  "En depósito",
  "Prestado",
  "Dado de baja",
  "En desuso",
];

const categoriasConsumibles = [
  "Papelería y Elementos de Oficina",
  "Limpieza e Higiene",
  "Otros",
];

async function main() {
  const usuario = process.env.SEED_USUARIO ?? "contable";
  const password = process.env.SEED_PASSWORD ?? "Patrimonio2026!";
  const nombre = process.env.SEED_NOMBRE ?? "Administrador";
  const apellido = process.env.SEED_APELLIDO ?? "Contable";

  const existente = await prisma.usuario.findUnique({ where: { usuario } });

  if (!existente) {
    await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        usuario,
        pass: await bcrypt.hash(password, 10),
        rol: "CONTABLE",
      },
    });
    console.log(`Usuario ${usuario} creado`);
  } else {
    console.log(`Usuario ${usuario} ya existe`);
  }

  for (const rubro of rubros) {
    await prisma.rubro.upsert({
      where: { codigoCategoria: rubro.codigoCategoria },
      update: {
        nombre: rubro.nombre,
        codigoInterno: rubro.codigoInterno,
        codigoCuenta: rubro.codigoCuenta,
        familia: rubro.familia,
      },
      create: rubro,
    });
  }

  for (const nombreEstado of estados) {
    await prisma.estadoBien.upsert({
      where: { nombre: nombreEstado },
      update: {},
      create: { nombre: nombreEstado },
    });
  }

  for (const nombreCategoria of categoriasConsumibles) {
    await prisma.categoriaConsumible.upsert({
      where: { nombre: nombreCategoria },
      update: {},
      create: { nombre: nombreCategoria },
    });
  }

  const totalRubros = await prisma.rubro.count();
  const totalEstados = await prisma.estadoBien.count();
  const totalCategorias = await prisma.categoriaConsumible.count();

  console.log(
    `Catálogos: ${totalRubros} rubros, ${totalEstados} estados, ${totalCategorias} categorías de consumibles`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
