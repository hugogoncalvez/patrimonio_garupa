import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const rubros = [
  { nombre: "Maquinarias y Equipos", codigoInterno: "MAQ", codigoCuenta: "5021001" },
  { nombre: "Muebles y Equipos de Oficina", codigoInterno: "MUE", codigoCuenta: "5021002" },
  { nombre: "Medios de Transporte", codigoInterno: "TRA", codigoCuenta: "5021005" },
  { nombre: "Edificios y Obras", codigoInterno: "EDI", codigoCuenta: "5021008" },
  { nombre: "Herramientas", codigoInterno: "HER", codigoCuenta: "5021009" },
];

const estados = [
  "En uso",
  "En reparación",
  "En depósito",
  "Prestado",
  "Dado de baja",
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
      where: { nombre: rubro.nombre },
      update: {
        codigoInterno: rubro.codigoInterno,
        codigoCuenta: rubro.codigoCuenta,
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
