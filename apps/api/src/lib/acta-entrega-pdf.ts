import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { ESCUDO_PNG_BASE64 } from "./escudo-base64.js";
import { MUNICIPIO_SALUDABLE_PNG_BASE64 } from "./municipio-saludable-base64.js";

interface MovimientoActa {
  nombreConsumibleSnapshot?: string | null;
  unidadMedidaSnapshot?: string | null;
  cantidad: unknown;
  consumible?: { nombre: string; unidadMedida: string } | null;
}

export interface EntregaActa {
  numero: string;
  fecha: Date | string;
  areaNombreSnapshot: string;
  responsableNombreSnapshot?: string | null;
  firmanteNombre: string;
  firmanteDni: string;
  usuarioNombreSnapshot?: string | null;
  observaciones?: string | null;
  estado: string;
  movimientos: MovimientoActa[];
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

function envolver(
  texto: string,
  font: PDFFont,
  size: number,
  ancho: number,
) {
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

export async function generarActaEntregaPdf(entrega: EntregaActa) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const escudo = await pdf.embedPng(Buffer.from(ESCUDO_PNG_BASE64, "base64"));
  const municipioSaludable = await pdf.embedPng(
    Buffer.from(MUNICIPIO_SALUDABLE_PNG_BASE64, "base64"),
  );

  const escudoAlto = 50;
  const escudoAncho = (escudo.width / escudo.height) * escudoAlto;
  const saludableAlto = 38;
  const saludableAncho =
    (municipioSaludable.width / municipioSaludable.height) * saludableAlto;

  pdf.setTitle(`Acta de entrega ${entrega.numero}`);
  pdf.setAuthor("Sistema de Gestión Patrimonial - Municipalidad de Garupá");

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

    centrar(page, "MUNICIPALIDAD DE GARUPÁ", negrita, 20, cursor, VERDE);
    centrar(
      page,
      "Provincia de Misiones",
      normal,
      9.5,
      cursor - 16,
      GRIS,
    );
    centrar(
      page,
      "ACTA DE ENTREGA DE CONSUMIBLES",
      negrita,
      15,
      cursor - 46,
    );
    centrar(page, `Acta N° ${entrega.numero}`, negrita, 11, cursor - 64);

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
    page.drawText("ACTA DE ENTREGA DE CONSUMIBLES", {
      x: MARGEN,
      y: height - MARGEN,
      size: 9,
      font: negrita,
      color: VERDE,
    });
    page.drawText(entrega.numero, {
      x: ANCHO - MARGEN - negrita.widthOfTextAtSize(entrega.numero, 9),
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

  const datos: [string, string][] = [
    ["Área destino", entrega.areaNombreSnapshot],
    ["Responsable del área", entrega.responsableNombreSnapshot ?? "Sin responsable"],
    ["Recibe", entrega.firmanteNombre],
    ["DNI", entrega.firmanteDni],
    ["Registrado por", entrega.usuarioNombreSnapshot ?? "-"],
    ["Fecha", fechaCorta(entrega.fecha)],
    ["Estado", entrega.estado === "ANULADA" ? "ANULADA" : "REGISTRADA"],
  ];

  const datosAlto = 140;
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

  let filaY = datosTop - 22;
  for (const [etiqueta, valor] of datos) {
    page.drawText(`${etiqueta}:`, {
      x: MARGEN + 12,
      y: filaY,
      size: 9.5,
      font: negrita,
      color: rgb(0.23, 0.23, 0.23),
    });
    page.drawText(valor, {
      x: MARGEN + 142,
      y: filaY,
      size: 9.5,
      font: normal,
      color:
        entrega.estado === "ANULADA" && etiqueta === "Estado"
          ? rgb(0.7, 0, 0)
          : rgb(0.1, 0.1, 0.1),
    });
    filaY -= 16;
  }

  y = datosTop - datosAlto - 24;

  const columnas = [34, 330, 78, 57];
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
    const titulos = ["#", "Consumible", "Unidad", "Cantidad"];
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

  entrega.movimientos.forEach((movimiento, indice) => {
    const nombre =
      movimiento.nombreConsumibleSnapshot ??
      movimiento.consumible?.nombre ??
      "Consumible";
    const unidad =
      movimiento.unidadMedidaSnapshot ??
      movimiento.consumible?.unidadMedida ??
      "-";

    const lineas = envolver(nombre, normal, 9, columnas[1] - 12);
    const alto = Math.max(24, lineas.length * 12 + 12);

    if (y - alto < 210) {
      agregarPagina();
      dibujarCabeceraTabla();
    }

    lineas.forEach((linea, lineaIndice) => {
      page.drawText(linea, {
        x: izquierda[1] + 6,
        y: y - 15 - lineaIndice * 12,
        size: 9,
        font: normal,
      });
    });

    page.drawText(String(indice + 1), {
      x: izquierda[0] + 6,
      y: y - 15,
      size: 9,
      font: normal,
    });
    page.drawText(unidad, {
      x: izquierda[2] + 6,
      y: y - 15,
      size: 9,
      font: normal,
    });
    page.drawText(cantidad(movimiento.cantidad), {
      x: izquierda[3] + 6,
      y: y - 15,
      size: 9,
      font: normal,
    });

    page.drawLine({
      start: { x: MARGEN, y: y - alto + 6 },
      end: { x: ANCHO - MARGEN, y: y - alto + 6 },
      thickness: 0.4,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= alto;
  });

  const totalTexto = `Total: ${entrega.movimientos.length} ${entrega.movimientos.length === 1 ? "línea" : "líneas"}`;

  y -= 10;
  page.drawText(totalTexto, {
    x: MARGEN,
    y: y - 10,
    size: 10,
    font: negrita,
    color: rgb(0.15, 0.15, 0.15),
  });
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

  const observaciones = entrega.observaciones?.trim() || "Sin observaciones.";
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

  const firmaAncho = 190;
  const firmaX = ANCHO - MARGEN - firmaAncho;
  const firmaY = 210;
  const centroFirma = firmaX + firmaAncho / 2;

  page.drawLine({
    start: { x: firmaX, y: firmaY },
    end: { x: firmaX + firmaAncho, y: firmaY },
    thickness: 0.7,
    color: rgb(0.2, 0.2, 0.2),
  });

  const textosFirma: [string, number, number, ReturnType<typeof rgb>][] = [
    ["Firma de quien recibe", 8.5, firmaY - 14, GRIS],
    [`Aclaración: ${entrega.firmanteNombre}`, 9, firmaY - 30, rgb(0.1, 0.1, 0.1)],
    [`DNI: ${entrega.firmanteDni}`, 8.5, firmaY - 44, rgb(0.1, 0.1, 0.1)],
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

  if (entrega.estado === "ANULADA") {
    page.drawText("ANULADA", {
      x: 150,
      y: 360,
      size: 64,
      font: negrita,
      color: rgb(0.75, 0, 0),
      opacity: 0.22,
      rotate: degrees(35),
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
      "El original firmado se archiva en el área de Patrimonio.",
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
