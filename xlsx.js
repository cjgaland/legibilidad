// ============================================================
//  xlsx.js — Excel (.xlsx) real sin dependencias · Auditorías
//  Copiado de la app Indicadores (skill app-xlsx-export: ZIP STORE + OOXML a mano).
//  window.Xlsx en navegador y module.exports en Node (tests).
// ============================================================
(function (raiz) {
"use strict";
/**
 * xlsx_zip.js — Motor ZIP mínimo (método STORE, sin compresión) + CRC32, sin dependencias.
 * Funciona igual en navegador y en Node (usa solo TextEncoder/Uint8Array, ambos nativos en los dos).
 *
 * Por qué STORE y no DEFLATE: comprimir de verdad exigiría reimplementar zlib/deflate a mano o una
 * librería — mucho esfuerzo para poco beneficio (los .xlsx de una sola planilla/informe pesan poco).
 * Excel abre sin ningún problema un ZIP sin comprimir; el estándar OOXML no exige compresión.
 */
const _crc32Tabla = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = _crc32Tabla[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function concatBytes(arrs) {
  let n = 0; for (const a of arrs) n += a.length;
  const out = new Uint8Array(n); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

/**
 * files: [{ name: 'ruta/dentro/del/zip.xml', bytes: Uint8Array }, ...]
 * devuelve un Uint8Array con el .zip completo (que es lo que es un .xlsx/.docx/.pptx por dentro).
 */
function zipStore(files) {
  const enc = new TextEncoder();
  const u16 = (n) => new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF]);
  const u32 = (n) => new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]);
  const chunks = []; const central = []; let offset = 0;
  const push = (a) => { chunks.push(a); offset += a.length; };
  const T = 0, D = 0x21; // hora 0, fecha DOS 1980-01-01 (no importa para que Excel lo abra)
  for (const f of files) {
    const name = enc.encode(f.name); const data = f.bytes; const crc = crc32(data); const lo = offset;
    push(concatBytes([u32(0x04034b50), u16(20), u16(0), u16(0), u16(T), u16(D), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)]));
    push(name); push(data);
    central.push(concatBytes([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(T), u16(D), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(lo), name]));
  }
  const cdStart = offset; let cdSize = 0;
  for (const c of central) { push(c); cdSize += c.length; }
  push(concatBytes([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(cdStart), u16(0)]));
  return concatBytes(chunks);
}

/**
 * xlsx_builder.js — Construcción de un libro .xlsx (una o varias hojas) en OOXML a mano.
 * Usa xlsx_zip.js para empaquetar. Funciona en navegador y en Node (ver xlsx_output.js para
 * la entrega final — descarga en el navegador vs escritura a fichero en Node).
 *
 * MODELO DE ESTILOS: en vez de los índices numéricos opacos que usa el OOXML crudo, aquí se
 * definen ESTILOS CON NOMBRE (objeto `estilos`) y se referencian por nombre al construir las
 * celdas. `construirStylesXml` los traduce a los índices que exige el formato.
 */

// Referencia de celda tipo "B3": columna (letra) + fila (número, base 1).
function colLetra(n) {
  let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s;
}
function xmlEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/**
 * Traduce un mapa de estilos con nombre a styles.xml + un índice { nombreEstilo: posición }.
 * Cada estilo admite: { negrita, cursiva, tamano, colorTexto (hex sin #), colorFondo (hex sin #),
 *   alineacion ('left'|'center'|'right'), vertical ('top'|'center'|'bottom'), ajustarTexto (bool),
 *   borde (bool, borde fino gris en las 4 caras — el único tipo de borde que soporta esta versión) }.
 * El estilo 0 (por defecto) siempre existe y no hace falta declararlo.
 */
function construirStylesXml(estilos = {}) {
  const nombres = Object.keys(estilos);
  const fuentesMap = new Map([['', 0]]); // clave = JSON de {negrita,cursiva,tamano,colorTexto} -> índice
  const fuentes = [{ negrita: false, cursiva: false, tamano: 11, colorTexto: null }];
  const rellenosMap = new Map([['', 0], ['gray125', 1]]); // 0 y 1 son fijos por el esquema (none/gray125)
  const rellenos = [null, null];
  const bordes = [null, { fino: true }]; // 0 = sin borde, 1 = borde fino gris (el único que se ofrece)
  const xfs = [{ fuente: 0, relleno: 0, borde: 0, alineacion: null, ajustarTexto: false }]; // índice 0 = por defecto

  const indice = {};
  nombres.forEach((nombre) => {
    const e = estilos[nombre] || {};
    const claveF = JSON.stringify([!!e.negrita, !!e.cursiva, e.tamano || 11, e.colorTexto || null]);
    let fi = fuentesMap.get(claveF);
    if (fi === undefined) { fi = fuentes.length; fuentes.push({ negrita: !!e.negrita, cursiva: !!e.cursiva, tamano: e.tamano || 11, colorTexto: e.colorTexto || null }); fuentesMap.set(claveF, fi); }
    let ri = 0;
    if (e.colorFondo) {
      const claveR = e.colorFondo;
      ri = rellenosMap.get(claveR);
      if (ri === undefined) { ri = rellenos.length; rellenos.push({ colorFondo: e.colorFondo }); rellenosMap.set(claveR, ri); }
    }
    const bi = e.borde === false ? 0 : 1; // por defecto CON borde fino (lo habitual en tablas de datos)
    xfs.push({ fuente: fi, relleno: ri, borde: bi, alineacion: e.alineacion || null, vertical: e.vertical || 'center', ajustarTexto: !!e.ajustarTexto });
    indice[nombre] = xfs.length - 1;
  });

  const xmlFuentes = fuentes.map((f) => `<font>${f.negrita ? '<b/>' : ''}${f.cursiva ? '<i/>' : ''}<sz val="${f.tamano}"/>${f.colorTexto ? `<color rgb="FF${f.colorTexto}"/>` : ''}<name val="Calibri"/></font>`).join('');
  const xmlRellenos = rellenos.map((r) => r ? `<fill><patternFill patternType="solid"><fgColor rgb="FF${r.colorFondo}"/></patternFill></fill>`
    : (rellenos.indexOf(r) === 1 ? `<fill><patternFill patternType="gray125"/></fill>` : `<fill><patternFill patternType="none"/></fill>`)).join('');
  const xmlBordes = bordes.map((b) => b ? `<border><left style="thin"><color rgb="FFB7B7B7"/></left><right style="thin"><color rgb="FFB7B7B7"/></right><top style="thin"><color rgb="FFB7B7B7"/></top><bottom style="thin"><color rgb="FFB7B7B7"/></bottom><diagonal/></border>`
    : `<border><left/><right/><top/><bottom/><diagonal/></border>`).join('');
  const xmlXfs = xfs.map((x) => {
    const aplica = [];
    if (x.fuente) aplica.push('applyFont="1"');
    if (x.relleno) aplica.push('applyFill="1"');
    if (x.borde) aplica.push('applyBorder="1"');
    const align = (x.alineacion || x.ajustarTexto) ? `applyAlignment="1"><alignment${x.alineacion ? ` horizontal="${x.alineacion}"` : ''} vertical="${x.vertical || 'center'}"${x.ajustarTexto ? ' wrapText="1"' : ''}/></xf>` : '/>';
    return `<xf numFmtId="0" fontId="${x.fuente}" fillId="${x.relleno}" borderId="${x.borde}" xfId="0" ${aplica.join(' ')} ${align}`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${fuentes.length}">${xmlFuentes}</fonts>
<fills count="${rellenos.length}">${xmlRellenos}</fills>
<borders count="${bordes.length}">${xmlBordes}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xmlXfs}</cellXfs>
</styleSheet>`;
  return { xml, indice };
}

/**
 * Construye el XML de UNA hoja a partir de una matriz de filas.
 * `filas`: array de filas; cada fila es un array de celdas o `null` (celda vacía con estilo por defecto).
 *   Celda de texto:  { texto: 'Hola', estilo: 'cabecera' }
 *   Celda numérica:  { numero: 42, estilo: 'normal' }
 *   Celda que combina columnas: añade `combinar: N` (numero de columnas totales que ocupa, incluida ella)
 * `opciones`: { anchoColumnas: [30, 8, 8, ...] (en caracteres aprox.), congelar: {filas:1, columnas:1},
 *   altoFilas: { 1: 26 } (alto en puntos para filas concretas, por índice 1-based) }
 * `indiceEstilos`: el `.indice` que devuelve construirStylesXml (nombre -> nº de estilo).
 */
function construirHojaXml(filas, opciones = {}, indiceEstilos = {}) {
  const estiloPorDefecto = 0;
  const resolverEstilo = (nombre) => (nombre && nombre in indiceEstilos) ? indiceEstilos[nombre] : estiloPorDefecto;
  const merges = [];
  let xmlFilas = '';
  filas.forEach((fila, idxFila) => {
    const r = idxFila + 1;
    let xmlCeldas = '';
    let col = 1;
    (fila || []).forEach((celda) => {
      const s = resolverEstilo(celda && celda.estilo);
      if (!celda) { xmlCeldas += `<c r="${colLetra(col)}${r}" s="${s}"/>`; col++; return; }
      const span = celda.combinar && celda.combinar > 1 ? celda.combinar : 1;
      if ('numero' in celda) xmlCeldas += `<c r="${colLetra(col)}${r}" s="${s}"><v>${celda.numero}</v></c>`;
      else xmlCeldas += `<c r="${colLetra(col)}${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(celda.texto || '')}</t></is></c>`;
      for (let k = 1; k < span; k++) xmlCeldas += `<c r="${colLetra(col + k)}${r}" s="${s}"/>`;
      if (span > 1) merges.push(`${colLetra(col)}${r}:${colLetra(col + span - 1)}${r}`);
      col += span;
    });
    const alto = (opciones.altoFilas || {})[r];
    xmlFilas += `<row r="${r}"${alto ? ` ht="${alto}" customHeight="1"` : ''}>${xmlCeldas}</row>`;
  });

  const anchoColumnas = opciones.anchoColumnas || [];
  const xmlCols = anchoColumnas.length
    ? `<cols>${anchoColumnas.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  let xmlVistas = `<sheetViews><sheetView${opciones.primera ? ' tabSelected="1"' : ''} workbookViewId="0">`;
  if (opciones.congelar && (opciones.congelar.filas || opciones.congelar.columnas)) {
    const xs = opciones.congelar.columnas || 0; const ys = opciones.congelar.filas || 0;
    const topLeft = `${colLetra(xs + 1)}${ys + 1}`;
    xmlVistas += `<pane xSplit="${xs}" ySplit="${ys}" topLeftCell="${topLeft}" activePane="bottomRight" state="frozen"/>`;
  }
  xmlVistas += '</sheetView></sheetViews>';
  const xmlMerges = merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${xmlVistas}${xmlCols}<sheetData>${xmlFilas}</sheetData>${xmlMerges}</worksheet>`;
}

/**
 * Ensambla el libro completo (una o varias hojas) y devuelve los bytes del .xlsx (Uint8Array).
 * `hojas`: [{ nombre: 'Turnos', filas: [...], opciones: {...} }, ...] — máx. 31 caracteres por
 *   nombre y sin los caracteres \ / ? * [ ] : (Excel los prohíbe); se recortan/sanean solos.
 * `estilos`: el mapa de estilos con nombre, compartido por TODAS las hojas del libro.
 */
function construirLibroXlsx({ hojas, estilos = {} }) {
  if (!hojas || !hojas.length) throw new Error('construirLibroXlsx: hace falta al menos una hoja');
  const enc = new TextEncoder();
  const { xml: stylesXml, indice: indiceEstilos } = construirStylesXml(estilos);

  const sanearNombreHoja = (n) => (n || 'Hoja').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Hoja';
  const nombresUsados = new Set();
  const nombresHojas = hojas.map((h) => {
    let n = sanearNombreHoja(h.nombre); let i = 2;
    while (nombresUsados.has(n)) { n = sanearNombreHoja(`${h.nombre} (${i})`); i++; }
    nombresUsados.add(n); return n;
  });

  const contentTypesOverrides = hojas.map((_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${contentTypesOverrides}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const sheetsXml = nombresHojas.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetsXml}</sheets></workbook>`;
  const wbRelsEntradas = hojas.map((_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('');
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${wbRelsEntradas}
<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const files = [
    { name: '[Content_Types].xml', bytes: enc.encode(contentTypes) },
    { name: '_rels/.rels', bytes: enc.encode(rels) },
    { name: 'xl/workbook.xml', bytes: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', bytes: enc.encode(wbRels) },
    { name: 'xl/styles.xml', bytes: enc.encode(stylesXml) },
    ...hojas.map((h, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, bytes: enc.encode(construirHojaXml(h.filas, Object.assign({}, h.opciones, { primera: i === 0 }), indiceEstilos)) })),
  ];
  return zipStore(files);
}

const API = { construirLibroXlsx, zipStore, crc32, colLetra, xmlEsc };
if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.Xlsx = API;
})(typeof window !== "undefined" ? window : globalThis);
