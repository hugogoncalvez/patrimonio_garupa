import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { ESCUDO_PNG_BASE64 } from "./escudo-base64.js";
import { MUNICIPIO_SALUDABLE_PNG_BASE64 } from "./municipio-saludable-base64.js";

export interface ColumnaReporte {
  titulo: string;
  peso: number;
  alineacion?: "left" | "right" | "center";
  maxLineas?: number;
}

export interface SeccionReporte {
  titulo: string;
  columnas: ColumnaReporte[];
  filas: string[][];
  totales?: string[];
  nota?: string;
}

export interface FiltroReporte {
  etiqueta: string;
  valor: string;
}

export interface ReportePdfData {
  titulo: string;
  subtitulo?: string;
  filtros: FiltroReporte[];
  secciones: SeccionReporte[];
}

const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 48;
const ANCHO_UTIL = ANCHO - MARGEN * 2;
const PIE_TOPE = 78;
const VERDE = rgb(0.12, 0.31, 0.22);
const VERDE_CLARO = rgb(0.945, 0.965, 0.95);
const FILA_ALTERNA = rgb(0.975, 0.982, 0.977);
const BORDE = rgb(0.83, 0.86, 0.84);
const GRIS = rgb(0.38, 0.38, 0.38);
const TEXTO = rgb(0.12, 0.12, 0.12);

function textoPdf(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[\u{10000}-\u{10ffff}]/gu, "?")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "?");
}

const formatoEmision = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

function envolver(
  texto: string,
  font: PDFFont,
  size: number,
  ancho: number,
  maxLineas = 4,
) {
  const limpio = textoPdf(texto).replace(/\s+/g, " ").trim();
  if (!limpio) return [""];

  const palabras = limpio.split(" ");
  const lineas: string[] = [];
  let actual = "";

  for (const palabra of palabras) {
    let resto = palabra;

    while (resto.length > 0) {
      const candidato = actual ? `${actual} ${resto}` : resto;

      if (font.widthOfTextAtSize(candidato, size) <= ancho) {
        actual = candidato;
        resto = "";
        continue;
      }

      if (actual) {
        lineas.push(actual);
        actual = "";
        continue;
      }

      let corte = resto.length;
      while (
        corte > 1 &&
        font.widthOfTextAtSize(resto.slice(0, corte), size) > ancho
      ) {
        corte -= 1;
      }
      lineas.push(resto.slice(0, corte));
      resto = resto.slice(corte);
    }
  }

  if (actual) lineas.push(actual);

  const limite = Math.max(1, maxLineas);
  if (lineas.length > limite) {
    const recortadas = lineas.slice(0, limite);
    let ultima = recortadas[limite - 1];

    while (
      ultima.length > 0 &&
      font.widthOfTextAtSize(`${ultima}...`, size) > ancho
    ) {
      ultima = ultima.slice(0, -1).trimEnd();
    }

    recortadas[limite - 1] = `${ultima}...`;
    return recortadas;
  }

  return lineas.length > 0 ? lineas : [""];
}

function recortarLinea(
  texto: string,
  font: PDFFont,
  size: number,
  ancho: number,
) {
  const limpio = textoPdf(texto).replace(/\s+/g, " ").trim();
  if (font.widthOfTextAtSize(limpio, size) <= ancho) return limpio;

  let corte = limpio;
  while (
    corte.length > 0 &&
    font.widthOfTextAtSize(`${corte}...`, size) > ancho
  ) {
    corte = corte.slice(0, -1).trimEnd();
  }

  return `${corte}...`;
}

function centrar(
  page: PDFPage,
  texto: string,
  font: PDFFont,
  size: number,
  y: number,
  color = TEXTO,
) {
  page.drawText(texto, {
    x: (ANCHO - font.widthOfTextAtSize(texto, size)) / 2,
    y,
    size,
    font,
    color,
  });
}

function ajustarTamano(
  texto: string,
  font: PDFFont,
  size: number,
  ancho: number,
) {
  let actual = size;
  while (actual > 8 && font.widthOfTextAtSize(texto, actual) > ancho) {
    actual -= 0.5;
  }
  return actual;
}

function lineasTexto(
  page: PDFPage,
  lineas: string[],
  x: number,
  ancho: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  alineacion: "left" | "right" | "center" = "left",
) {
  lineas.forEach((linea, indice) => {
    const anchoLinea = font.widthOfTextAtSize(linea, size);
    const textoX =
      alineacion === "right"
        ? x + ancho - anchoLinea
        : alineacion === "center"
          ? x + (ancho - anchoLinea) / 2
          : x;

    page.drawText(linea, {
      x: textoX,
      y: y - indice * 9.4,
      size,
      font,
      color,
    });
  });
}

function calcularAnchos(columnas: ColumnaReporte[]) {
  const totalPeso = columnas.reduce(
    (total, columna) => total + Math.max(0.1, columna.peso),
    0,
  );

  return columnas.map(
    (columna) => (Math.max(0.1, columna.peso) / totalPeso) * ANCHO_UTIL,
  );
}

export async function generarReportePdf(data: ReportePdfData) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const escudo = await pdf.embedPng(Buffer.from(ESCUDO_PNG_BASE64, "base64"));
  const municipioSaludable = await pdf.embedPng(
    Buffer.from(MUNICIPIO_SALUDABLE_PNG_BASE64, "base64"),
  );

  const emision = formatoEmision.format(new Date());
  const titulo = data.titulo.toUpperCase();

  pdf.setTitle(titulo);
  pdf.setAuthor("Sistema de Gestión Patrimonial - Municipalidad de Garupá");
  pdf.setSubject("Reporte operativo");

  const escudoAlto = 58;
  const escudoAncho = (escudo.width / escudo.height) * escudoAlto;
  const saludableAlto = 34;
  const saludableAncho =
    (municipioSaludable.width / municipioSaludable.height) * saludableAlto;

  let page: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = 0;

  const cabeceraCompleta = (pagina: PDFPage) => {
    page = pagina;
    const cursor = ALTO - MARGEN;

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
        negrita.widthOfTextAtSize(patrimonio, 10) / 2,
      y: cursor - saludableAlto - 12,
      size: 10,
      font: negrita,
    });

    centrar(page, "MUNICIPALIDAD DE GARUPÁ", negrita, 18, cursor, VERDE);
    centrar(
      page,
      "Provincia de Misiones",
      normal,
      9,
      cursor - 15,
      GRIS,
    );
    centrar(
      page,
      "SISTEMA DE GESTIÓN PATRIMONIAL",
      negrita,
      8,
      cursor - 28,
      GRIS,
    );

    const tamanoTitulo = ajustarTamano(titulo, negrita, 14, ANCHO_UTIL - 110);
    centrar(page, titulo, negrita, tamanoTitulo, cursor - 53);

    if (data.subtitulo) {
      centrar(page, data.subtitulo, normal, 8.5, cursor - 68, GRIS);
    }

    page.drawLine({
      start: { x: MARGEN, y: cursor - 81 },
      end: { x: ANCHO - MARGEN, y: cursor - 81 },
      thickness: 1.2,
      color: VERDE,
    });

    return cursor - 94;
  };

  const cabeceraCompacta = (pagina: PDFPage) => {
    page = pagina;
    const cursor = ALTO - MARGEN;

    page.drawText(titulo, {
      x: MARGEN,
      y: cursor,
      size: 9.5,
      font: negrita,
      color: VERDE,
    });
    page.drawText("REPORTE", {
      x: ANCHO - MARGEN - negrita.widthOfTextAtSize("REPORTE", 8),
      y: cursor,
      size: 8,
      font: negrita,
      color: GRIS,
    });
    page.drawLine({
      start: { x: MARGEN, y: cursor - 9 },
      end: { x: ANCHO - MARGEN, y: cursor - 9 },
      thickness: 0.6,
      color: BORDE,
    });

    return cursor - 28;
  };

  const nuevaPagina = () => {
    page = pdf.addPage([ANCHO, ALTO]);
    y = cabeceraCompacta(page);
  };

  const dibujarFiltros = (inicio: number) => {
    const filtros = [
      ...(data.filtros.length > 0
        ? data.filtros
        : [{ etiqueta: "Filtros", valor: "Sin filtros aplicados" }]),
      { etiqueta: "Emitido", valor: emision },
    ];
    const altoFila = 13;
    const alto = 17 + filtros.length * altoFila + 4;

    page.drawRectangle({
      x: MARGEN,
      y: inicio - alto,
      width: ANCHO_UTIL,
      height: alto,
      color: VERDE_CLARO,
      borderColor: BORDE,
      borderWidth: 0.7,
    });

    let filaY = inicio - 17;
    for (const filtro of filtros) {
      page.drawText(`${filtro.etiqueta}:`, {
        x: MARGEN + 11,
        y: filaY,
        size: 7.5,
        font: negrita,
        color: rgb(0.23, 0.23, 0.23),
      });
      page.drawText(
        recortarLinea(
          filtro.valor,
          normal,
          8,
          ANCHO_UTIL - 98,
        ),
        {
          x: MARGEN + 82,
          y: filaY,
          size: 8,
          font: normal,
          color: TEXTO,
        },
      );
      filaY -= altoFila;
    }

    return inicio - alto - 19;
  };

  const dibujarTituloSeccion = (inicio: number, tituloSeccion: string) => {
    page.drawText(tituloSeccion, {
      x: MARGEN,
      y: inicio,
      size: 11,
      font: negrita,
      color: VERDE,
    });
    page.drawLine({
      start: { x: MARGEN, y: inicio - 6 },
      end: { x: ANCHO - MARGEN, y: inicio - 6 },
      thickness: 0.6,
      color: BORDE,
    });
    return inicio - 20;
  };

  const dibujarTabla = (inicio: number, seccion: SeccionReporte) => {
    const anchos = calcularAnchos(seccion.columnas);
    const izquierdas: number[] = [MARGEN];
    for (let i = 1; i < anchos.length; i += 1) {
      izquierdas.push(izquierdas[i - 1] + anchos[i - 1]);
    }

    const lineasCabecera = seccion.columnas.map((columna, indice) =>
      envolver(
        columna.titulo,
        negrita,
        8,
        anchos[indice] - 9,
        columna.maxLineas ?? 2,
      ),
    );
    const altoCabecera =
      Math.max(1, ...lineasCabecera.map((lineas) => lineas.length)) * 9 + 7;

    const dibujarCabecera = () => {
      page.drawRectangle({
        x: MARGEN,
        y: y - altoCabecera,
        width: ANCHO_UTIL,
        height: altoCabecera,
        color: VERDE,
      });

      lineasCabecera.forEach((lineas, indice) => {
        lineasTexto(
          page,
          lineas,
          izquierdas[indice] + 4,
          anchos[indice] - 8,
          y - 10,
          negrita,
          8,
          rgb(1, 1, 1),
          seccion.columnas[indice].alineacion ?? "left",
        );
      });

      y -= altoCabecera;
    };

    y = inicio;
    dibujarCabecera();

    if (seccion.filas.length === 0) {
      if (y - 22 < PIE_TOPE) {
        nuevaPagina();
        dibujarCabecera();
      }
      page.drawRectangle({
        x: MARGEN,
        y: y - 22,
        width: ANCHO_UTIL,
        height: 22,
        color: FILA_ALTERNA,
      });
      page.drawText("Sin resultados para los filtros aplicados.", {
        x: MARGEN + 7,
        y: y - 15,
        size: 8.5,
        font: normal,
        color: GRIS,
      });
      y -= 22;
    }

    seccion.filas.forEach((fila, indice) => {
      const celdas = seccion.columnas.map((columna, columnaIndice) =>
        envolver(
          fila[columnaIndice] ?? "",
          normal,
          8,
          anchos[columnaIndice] - 9,
          columna.maxLineas ?? 4,
        ),
      );
      const cantidadLineas = Math.max(
        1,
        ...celdas.map((lineas) => lineas.length),
      );
      const altoFila = Math.max(15, cantidadLineas * 9.4 + 5);

      if (y - altoFila < PIE_TOPE) {
        nuevaPagina();
        dibujarCabecera();
      }

      if (indice % 2 === 1) {
        page.drawRectangle({
          x: MARGEN,
          y: y - altoFila,
          width: ANCHO_UTIL,
          height: altoFila,
          color: FILA_ALTERNA,
        });
      }

      celdas.forEach((lineas, columnaIndice) => {
        lineasTexto(
          page,
          lineas,
          izquierdas[columnaIndice] + 4,
          anchos[columnaIndice] - 8,
          y - 10,
          normal,
          8,
          TEXTO,
          seccion.columnas[columnaIndice].alineacion ?? "left",
        );
      });

      page.drawLine({
        start: { x: MARGEN, y: y - altoFila },
        end: { x: ANCHO - MARGEN, y: y - altoFila },
        thickness: 0.35,
        color: BORDE,
      });

      y -= altoFila;
    });

    if (seccion.totales?.length) {
      y -= 9;
      for (const total of seccion.totales) {
        if (y - 14 < PIE_TOPE) nuevaPagina();
        page.drawText(total, {
          x: MARGEN,
          y: y - 10,
          size: 9,
          font: negrita,
          color: rgb(0.18, 0.18, 0.18),
        });
        y -= 13;
      }
    }

    if (seccion.nota) {
      const lineasNota = envolver(seccion.nota, normal, 7.5, ANCHO_UTIL, 3);
      y -= 5;
      for (const linea of lineasNota) {
        if (y - 11 < PIE_TOPE) nuevaPagina();
        page.drawText(linea, {
          x: MARGEN,
          y: y - 8,
          size: 7.5,
          font: normal,
          color: GRIS,
        });
        y -= 9.5;
      }
    }

    return y - 24;
  };

  y = cabeceraCompleta(page);
  y = dibujarFiltros(y);

  data.secciones.forEach((seccion, indice) => {
    if (indice > 0 || y < PIE_TOPE + 115) {
      nuevaPagina();
    }

    y = dibujarTituloSeccion(y, seccion.titulo);
    y = dibujarTabla(y, seccion);
  });

  const paginas = pdf.getPages();
  paginas.forEach((pagina, indice) => {
    pagina.drawLine({
      start: { x: MARGEN, y: 61 },
      end: { x: ANCHO - MARGEN, y: 61 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    pagina.drawText(
      "Sistema de Gestión Patrimonial - Municipalidad de Garupá",
      { x: MARGEN, y: 46, size: 7, font: normal, color: GRIS },
    );
    pagina.drawText(
      "Documento operativo generado automáticamente. No es un formato oficial del HTC.",
      { x: MARGEN, y: 36, size: 7, font: normal, color: GRIS },
    );
    pagina.drawText(`Página ${indice + 1} de ${paginas.length}`, {
      x: ANCHO - MARGEN - 70,
      y: 36,
      size: 7,
      font: normal,
      color: GRIS,
    });
  });

  return pdf.save();
}
