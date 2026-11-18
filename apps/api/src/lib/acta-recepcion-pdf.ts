import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { ESCUDO_PNG_BASE64 } from "./escudo-base64.js";
import { MUNICIPIO_SALUDABLE_PNG_BASE64 } from "./municipio-saludable-base64.js";

interface CompraActa {
  fecha: Date | string;
  organismo: "DE" | "HCD";
  numeroOrdenPago?: string | null;
  proveedor?: string | null;
  proveedorDatos?: { nombre: string; cuit?: string | null } | null;
  comprobantes?: {
    tipo: string;
    numero?: string | null;
    fecha?: Date | string | null;
  }[];
}

interface DetalleActa {
  cantidad: unknown;
  compraDetalle?: {
    tipo: "INVENTARIABLE" | "CONSUMIBLE";
    descripcion?: string | null;
    rubro?: { nombre: string } | null;
    consumible?: { nombre: string; unidadMedida?: string | null } | null;
  } | null;
  bienes?: { codigoInventario: string; descripcion?: string | null }[];
}

export interface RecepcionActa {
  numero: string;
  fecha: Date | string;
  observaciones?: string | null;
  usuario?: { nombre: string; apellido: string } | null;
  compra: CompraActa;
  detalles: DetalleActa[];
}

const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 48;
const ANCHO_UTIL = ANCHO - MARGEN * 2;
const VERDE = rgb(0.12, 0.31, 0.22);
const VERDE_CLARO = rgb(0.945, 0.965, 0.95);
const BORDE = rgb(0.83, 0.86, 0.84);
const GRIS = rgb(0.38, 0.38, 0.38);

function fechaCorta(value: Date | string) {
  const fecha = new Date(value);
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${fecha.getUTCFullYear()}`;
}

function cantidad(value: unknown) {
  const numero = Number(value);
  if (!Number.isFinite(numero)) return "0";
  return numero.toLocaleString("es-AR", { maximumFractionDigits: 3 });
}

function envolver(texto: string, font: PDFFont, size: number, ancho: number) {
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";

  for (const palabra of palabras) {
    const candidato = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(candidato, size) <= ancho) {
      actual = candidato;
      continue;
    }

    if (actual) lineas.push(actual);
    actual = palabra;
  }

  if (actual) lineas.push(actual);
  return lineas.length > 0 ? lineas : [""];
}

function centrar(
  page: PDFPage,
  texto: string,
  font: PDFFont,
  size: number,
  y: number,
  color = rgb(0, 0, 0),
) {
  page.drawText(texto, {
    x: (page.getWidth() - font.widthOfTextAtSize(texto, size)) / 2,
    y,
    size,
    font,
    color,
  });
}

function formatearRegistrante(
  usuario?: { nombre: string; apellido: string } | null,
) {
  if (!usuario?.nombre.trim() || !usuario.apellido.trim()) return "-";
  return `${usuario.apellido.trim()}, ${usuario.nombre.trim()}.`;
}

function textoComprobantes(compra: CompraActa) {
  if (!compra.comprobantes?.length) return "Sin comprobantes.";

  return compra.comprobantes
    .map((comprobante) => {
      const fecha = comprobante.fecha
        ? ` (${fechaCorta(comprobante.fecha)})`
        : "";
      return `${comprobante.tipo}${comprobante.numero ? ` ${comprobante.numero}` : ""}${fecha}`;
    })
    .join(" · ");
}

function descripcionDetalle(detalle: DetalleActa) {
  const item = detalle.compraDetalle;
  if (!item) return "Ítem";

  if (item.tipo === "CONSUMIBLE") {
    const nombre = item.consumible?.nombre ?? item.descripcion ?? "Consumible";
    return item.consumible?.unidadMedida
      ? `${nombre} (${item.consumible.unidadMedida})`
      : nombre;
  }

  return item.descripcion || item.rubro?.nombre || "Bien";
}

export async function generarActaRecepcionPdf(acta: RecepcionActa) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const escudo = await pdf.embedPng(Buffer.from(ESCUDO_PNG_BASE64, "base64"));
  const municipioSaludable = await pdf.embedPng(
    Buffer.from(MUNICIPIO_SALUDABLE_PNG_BASE64, "base64"),
  );

  const escudoAlto = 64;
  const escudoAncho = (escudo.width / escudo.height) * escudoAlto;
  const saludableAlto = 38;
  const saludableAncho =
    (municipioSaludable.width / municipioSaludable.height) * saludableAlto;

  pdf.setTitle(`Acta de recepción ${acta.numero}`);
  pdf.setAuthor("Sistema de Gestión Patrimonial - Municipalidad de Garupá");
  pdf.setSubject("Acta de recepción de bienes y consumibles");

  let page: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = 0;

  const encabezadoCompleto = (nueva: PDFPage) => {
    page = nueva;
    const { height } = page.getSize();
    const cursor = height - MARGEN;

    page.drawImage(escudo, {
      x: MARGEN,
      y: cursor - escudoAlto + 2,
      width: escudoAncho,
      height: escudoAlto,
    });
    page.drawImage(municipioSaludable, {
      x: ANCHO - MARGEN - saludableAncho,
      y: cursor - saludableAlto + 2,
      width: saludableAncho,
      height: saludableAlto,
    });

    const patrimonio = "Patrimonio";
    page.drawText(patrimonio, {
      x:
        ANCHO -
        MARGEN -
        saludableAncho / 2 -
        negrita.widthOfTextAtSize(patrimonio, 11) / 2,
      y: cursor - saludableAlto - 11,
      size: 11,
      font: negrita,
    });

    centrar(page, "MUNICIPALIDAD DE GARUPÁ", negrita, 20, cursor, VERDE);
    centrar(page, "Provincia de Misiones", normal, 9.5, cursor - 16, GRIS);
    centrar(page, "ACTA DE RECEPCIÓN", negrita, 15, cursor - 46);
    centrar(page, `Acta N° ${acta.numero}`, negrita, 11, cursor - 64);

    page.drawLine({
      start: { x: MARGEN, y: cursor - 78 },
      end: { x: ANCHO - MARGEN, y: cursor - 78 },
      thickness: 1.2,
      color: VERDE,
    });

    return cursor - 94;
  };

  const encabezadoCompacto = (nueva: PDFPage) => {
    page = nueva;
    const { height } = page.getSize();
    page.drawText("ACTA DE RECEPCIÓN", {
      x: MARGEN,
      y: height - MARGEN,
      size: 9,
      font: negrita,
      color: VERDE,
    });
    page.drawText(acta.numero, {
      x: ANCHO - MARGEN - negrita.widthOfTextAtSize(acta.numero, 9),
      y: height - MARGEN,
      size: 9,
      font: negrita,
    });
    page.drawLine({
      start: { x: MARGEN, y: height - MARGEN - 8 },
      end: { x: ANCHO - MARGEN, y: height - MARGEN - 8 },
      thickness: 0.5,
      color: BORDE,
    });
    return height - MARGEN - 28;
  };

  const agregarPagina = () => {
    y = encabezadoCompacto(pdf.addPage([ANCHO, ALTO]));
  };

  y = encabezadoCompleto(page);

  const organismo =
    acta.compra.organismo === "DE"
      ? "Departamento Ejecutivo"
      : "Honorable Concejo Deliberante";
  const proveedor =
    acta.compra.proveedorDatos?.nombre ?? acta.compra.proveedor ?? "-";

  const datos: [string, string][] = [
    ["Organismo", organismo],
    ["Proveedor", proveedor],
    ["CUIT", acta.compra.proveedorDatos?.cuit ?? "-"],
    ["Orden de pago", acta.compra.numeroOrdenPago ?? "-"],
    ["Fecha de compra", fechaCorta(acta.compra.fecha)],
    ["Fecha de recepción", fechaCorta(acta.fecha)],
    ["Registrada por", formatearRegistrante(acta.usuario)],
    ["Comprobantes", textoComprobantes(acta.compra)],
  ];

  const valorAncho = ANCHO_UTIL - 150;
  const filasDatos = datos.map(([etiqueta, valor]) => ({
    etiqueta,
    lineas: envolver(valor, normal, 9, valorAncho),
  }));
  const datosAlto = filasDatos.reduce(
    (total, fila) => total + Math.max(1, fila.lineas.length) * 12 + 6,
    22,
  );
  const datosTop = y;

  page.drawRectangle({
    x: MARGEN,
    y: datosTop - datosAlto,
    width: ANCHO_UTIL,
    height: datosAlto,
    color: VERDE_CLARO,
    borderColor: BORDE,
    borderWidth: 0.8,
  });

  let filaY = datosTop - 18;
  for (const fila of filasDatos) {
    page.drawText(`${fila.etiqueta}:`, {
      x: MARGEN + 12,
      y: filaY,
      size: 9.5,
      font: negrita,
      color: rgb(0.23, 0.23, 0.23),
    });
    fila.lineas.forEach((linea, indice) => {
      page.drawText(linea, {
        x: MARGEN + 140,
        y: filaY - indice * 11.5,
        size: 9,
        font: normal,
        color: rgb(0.1, 0.1, 0.1),
      });
    });
    filaY -= Math.max(1, fila.lineas.length) * 12 + 6;
  }

  y = datosTop - datosAlto - 24;

  const columnas = [28, 215, 68, 58, 130];
  const izquierda = [MARGEN];
  for (let i = 1; i < columnas.length; i += 1) {
    izquierda.push(izquierda[i - 1] + columnas[i - 1]);
  }

  const dibujarCabeceraTabla = () => {
    const altoFila = 24;
    page.drawRectangle({
      x: MARGEN,
      y: y - altoFila + 5,
      width: ANCHO_UTIL,
      height: altoFila,
      color: VERDE,
    });
    const titulos = ["#", "Detalle", "Tipo", "Cant.", "Código/s"];
    titulos.forEach((titulo, indice) => {
      page.drawText(titulo, {
        x: izquierda[indice] + (indice === 0 ? 5 : 6),
        y: y - 11,
        size: 9.5,
        font: negrita,
        color: rgb(1, 1, 1),
      });
    });
    y -= altoFila;
  };

  dibujarCabeceraTabla();

  acta.detalles.forEach((detalle, indice) => {
    const item = detalle.compraDetalle;
    const descripcion = descripcionDetalle(detalle);
    const tipo = item?.tipo === "INVENTARIABLE" ? "Bien" : "Consumible";
    const codigos =
      detalle.bienes && detalle.bienes.length > 0
        ? detalle.bienes.map((bien) => bien.codigoInventario).join(", ")
        : "-";

    const lineasDescripcion = envolver(
      descripcion,
      normal,
      9,
      columnas[1] - 12,
    );
    const lineasCodigos = envolver(codigos, normal, 8.5, columnas[4] - 12);
    const alto = Math.max(
      24,
      Math.max(lineasDescripcion.length, lineasCodigos.length) * 11 + 12,
    );

    if (y - alto < 230) {
      agregarPagina();
      dibujarCabeceraTabla();
    }

    page.drawText(String(indice + 1), {
      x: izquierda[0] + 6,
      y: y - 15,
      size: 9,
      font: normal,
    });

    lineasDescripcion.forEach((linea, lineaIndice) => {
      page.drawText(linea, {
        x: izquierda[1] + 6,
        y: y - 15 - lineaIndice * 11,
        size: 9,
        font: normal,
      });
    });

    page.drawText(tipo, {
      x: izquierda[2] + 6,
      y: y - 15,
      size: 9,
      font: normal,
    });

    page.drawText(cantidad(detalle.cantidad), {
      x: izquierda[3] + 6,
      y: y - 15,
      size: 9,
      font: normal,
    });

    lineasCodigos.forEach((linea, lineaIndice) => {
      page.drawText(linea, {
        x: izquierda[4] + 6,
        y: y - 15 - lineaIndice * 11,
        size: 8.5,
        font: normal,
        color: rgb(0.25, 0.25, 0.25),
      });
    });

    page.drawLine({
      start: { x: MARGEN, y: y - alto + 6 },
      end: { x: ANCHO - MARGEN, y: y - alto + 6 },
      thickness: 0.4,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= alto;
  });

  y -= 10;
  page.drawText(
    `Total: ${acta.detalles.length} ${acta.detalles.length === 1 ? "línea" : "líneas"}`,
    {
      x: MARGEN,
      y: y - 10,
      size: 10,
      font: negrita,
      color: rgb(0.15, 0.15, 0.15),
    },
  );
  y -= 30;

  if (y < 260) {
    agregarPagina();
  }

  page.drawText("Observaciones:", {
    x: MARGEN,
    y,
    size: 10,
    font: negrita,
    color: VERDE,
  });
  y -= 15;

  const observaciones = acta.observaciones?.trim() || "Sin observaciones.";
  const lineasObservacion = envolver(observaciones, normal, 9, ANCHO_UTIL);
  for (const linea of lineasObservacion) {
    if (y < 215) {
      agregarPagina();
      y -= 5;
    }
    page.drawText(linea, { x: MARGEN, y, size: 9, font: normal });
    y -= 12;
  }

  if (y < 260) {
    agregarPagina();
  }

  const firmaAncho = 248;
  const firmaX = (ANCHO - firmaAncho) / 2;
  const firmaY = 190;
  const centroFirma = firmaX + firmaAncho / 2;

  page.drawLine({
    start: { x: firmaX, y: firmaY },
    end: { x: firmaX + firmaAncho, y: firmaY },
    thickness: 0.7,
    color: rgb(0.2, 0.2, 0.2),
  });

  const textosFirma: [string, number, number, ReturnType<typeof rgb>][] = [
    ["Firma del Encargado de Patrimonio", 9, firmaY - 15, GRIS],
    ["Aclaración y DNI", 8.5, firmaY - 31, GRIS],
  ];
  for (const [texto, size, textoY, color] of textosFirma) {
    page.drawText(texto, {
      x: centroFirma - normal.widthOfTextAtSize(texto, size) / 2,
      y: textoY,
      size,
      font: normal,
      color,
    });
  }

  const paginas = pdf.getPages();
  paginas.forEach((pagina, indice) => {
    pagina.drawLine({
      start: { x: MARGEN, y: 62 },
      end: { x: ANCHO - MARGEN, y: 62 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    pagina.drawText(
      "Sistema de Gestión Patrimonial - Municipalidad de Garupá",
      { x: MARGEN, y: 47, size: 7, font: normal, color: GRIS },
    );
    pagina.drawText(
      "Original firmado: Patrimonio · Copia para Contabilidad.",
      { x: MARGEN, y: 37, size: 7, font: normal, color: GRIS },
    );
    pagina.drawText(`Página ${indice + 1} de ${paginas.length}`, {
      x: ANCHO - MARGEN - 70,
      y: 37,
      size: 7,
      font: normal,
      color: GRIS,
    });
  });

  return pdf.save();
}
