import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

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

export async function generarActaEntregaPdf(entrega: EntregaActa) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle(`Acta de entrega ${entrega.numero}`);
  pdf.setAuthor("Sistema de Gestión Patrimonial - Municipalidad de Garupá");

  let page: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = 0;

  const encabezadoCompleto = (nueva: PDFPage) => {
    page = nueva;
    const { height } = page.getSize();
    let cursor = height - MARGEN;

    page.drawText("MUNICIPALIDAD DE GARUPÁ", {
      x: MARGEN,
      y: cursor,
      size: 15,
      font: negrita,
      color: rgb(0.06, 0.3, 0.23),
    });
    page.drawText("Sistema de Gestión Patrimonial", {
      x: MARGEN,
      y: cursor - 16,
      size: 9,
      font: normal,
      color: rgb(0.35, 0.35, 0.35),
    });
    page.drawText("ACTA DE ENTREGA DE CONSUMIBLES", {
      x: MARGEN,
      y: cursor - 44,
      size: 13,
      font: negrita,
    });

    const numero = `Acta N° ${entrega.numero}`;
    page.drawText(numero, {
      x: ANCHO - MARGEN - negrita.widthOfTextAtSize(numero, 10),
      y: cursor - 44,
      size: 10,
      font: negrita,
    });

    page.drawLine({
      start: { x: MARGEN, y: cursor - 58 },
      end: { x: ANCHO - MARGEN, y: cursor - 58 },
      thickness: 1,
      color: rgb(0.06, 0.3, 0.23),
    });

    return cursor - 78;
  };

  const encabezadoCompacto = (nueva: PDFPage) => {
    page = nueva;
    const { height } = page.getSize();
    page.drawText("ACTA DE ENTREGA DE CONSUMIBLES", {
      x: MARGEN,
      y: height - MARGEN,
      size: 9,
      font: negrita,
      color: rgb(0.06, 0.3, 0.23),
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
      color: rgb(0.7, 0.7, 0.7),
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

  for (const [etiqueta, valor] of datos) {
    page.drawText(`${etiqueta}:`, {
      x: MARGEN,
      y,
      size: 9,
      font: negrita,
      color: rgb(0.25, 0.25, 0.25),
    });
    page.drawText(valor, {
      x: MARGEN + 116,
      y,
      size: 9,
      font: normal,
      color: entrega.estado === "ANULADA" && etiqueta === "Estado"
        ? rgb(0.7, 0, 0)
        : rgb(0, 0, 0),
    });
    y -= 14;
  }

  y -= 8;

  const columnas = [26, 300, 65, 70];
  const izquierda = [MARGEN];
  for (let i = 1; i < columnas.length; i += 1) {
    izquierda.push(izquierda[i - 1] + columnas[i - 1]);
  }

  const dibujarCabeceraTabla = () => {
    const altoFila = 22;
    page.drawRectangle({
      x: MARGEN,
      y: y - altoFila + 5,
      width: ANCHO_UTIL,
      height: altoFila,
      color: rgb(0.9, 0.94, 0.92),
    });
    const titulos = ["#", "Consumible", "Unidad", "Cantidad"];
    titulos.forEach((titulo, indice) => {
      page.drawText(titulo, {
        x: izquierda[indice] + (indice === 0 ? 5 : 4),
        y: y - 9,
        size: 8,
        font: negrita,
        color: rgb(0.1, 0.3, 0.23),
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

    const lineas = envolver(nombre, normal, 8, columnas[1] - 8);
    const alto = Math.max(18, lineas.length * 11 + 7);

    if (y - alto < 170) {
      agregarPagina();
      dibujarCabeceraTabla();
    }

    lineas.forEach((linea, lineaIndice) => {
      page.drawText(linea, {
        x: izquierda[1] + 4,
        y: y - 11 - lineaIndice * 11,
        size: 8,
        font: normal,
      });
    });

    page.drawText(String(indice + 1), {
      x: izquierda[0] + 5,
      y: y - 11,
      size: 8,
      font: normal,
    });
    page.drawText(unidad, {
      x: izquierda[2] + 4,
      y: y - 11,
      size: 8,
      font: normal,
    });
    page.drawText(cantidad(movimiento.cantidad), {
      x: izquierda[3] + 4,
      y: y - 11,
      size: 8,
      font: normal,
    });

    page.drawLine({
      start: { x: MARGEN, y: y - alto + 5 },
      end: { x: ANCHO - MARGEN, y: y - alto + 5 },
      thickness: 0.35,
      color: rgb(0.82, 0.82, 0.82),
    });

    y -= alto;
  });

  const totalTexto = `Total: ${entrega.movimientos.length} ${entrega.movimientos.length === 1 ? "línea" : "líneas"}`;

  y -= 4;
  page.drawText(totalTexto, {
    x: MARGEN,
    y: y - 8,
    size: 8,
    font: negrita,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 26;

  if (y < 210) {
    agregarPagina();
  }

  page.drawText("Observaciones:", {
    x: MARGEN,
    y,
    size: 9,
    font: negrita,
  });
  y -= 13;

  const observaciones = entrega.observaciones?.trim() || "Sin observaciones.";
  const lineasObservacion = envolver(observaciones, normal, 8, ANCHO_UTIL);
  for (const linea of lineasObservacion) {
    if (y < 180) {
      agregarPagina();
      y -= 5;
    }
    page.drawText(linea, { x: MARGEN, y, size: 8, font: normal });
    y -= 11;
  }

  if (y < 185) {
    agregarPagina();
  }

  const firmaX = ANCHO - MARGEN - 210;
  const firmaY = 118;
  page.drawLine({
    start: { x: firmaX, y: firmaY },
    end: { x: firmaX + 200, y: firmaY },
    thickness: 0.6,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText("Firma", {
    x: firmaX,
    y: firmaY - 12,
    size: 8,
    font: normal,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(`Aclaración: ${entrega.firmanteNombre}`, {
    x: firmaX,
    y: firmaY - 27,
    size: 8,
    font: normal,
  });
  page.drawText(`DNI: ${entrega.firmanteDni}`, {
    x: firmaX,
    y: firmaY - 40,
    size: 8,
    font: normal,
  });

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
      start: { x: MARGEN, y: 42 },
      end: { x: ANCHO - MARGEN, y: 42 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    pagina.drawText(
      "Sistema de Gestión Patrimonial - Municipalidad de Garupá",
      { x: MARGEN, y: 28, size: 7, font: normal, color: rgb(0.4, 0.4, 0.4) },
    );
    pagina.drawText(
      "El original firmado se archiva en el área de Patrimonio.",
      { x: MARGEN, y: 18, size: 7, font: normal, color: rgb(0.4, 0.4, 0.4) },
    );
    pagina.drawText(`Página ${indice + 1} de ${paginas.length}`, {
      x: ANCHO - MARGEN - 70,
      y: 18,
      size: 7,
      font: normal,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  return pdf.save();
}
