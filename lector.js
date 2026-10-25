// ============================================================
//  lector.js — Legibilidad · leer informes (PDF, DOCX, TXT, MD)
//  window.Lector en navegador y module.exports en Node (tests).
//
//  Todo ocurre en el navegador: el archivo nunca se envía a ningún sitio.
//  Cada lector devuelve { texto, titulos }: el texto con un párrafo por
//  línea (y una línea en blanco antes de cada título) y la lista de
//  títulos que el archivo marca como tales, para analizar por apartados.
//  - TXT: lectura directa (UTF-8 o, si no cuadra, Windows-1252).
//  - MD: quita las marcas de formato; los «#» son títulos.
//  - DOCX: ZIP descomprimido con DecompressionStream("deflate-raw");
//    lee word/document.xml y los estilos de título (Heading/Título).
//  - PDF: pdf.js de Mozilla, copia local en vendor/ (carga diferida);
//    los títulos se reconocen por el tamaño de letra.
// ============================================================
(function (raiz) {
  "use strict";

  const MAX_BYTES = 15 * 1024 * 1024;       // 15 MB
  const MAX_CARACTERES = 200000;            // el mismo límite que Mis textos
  const PDFJS = "./vendor/pdfjs-6.4.299/";

  const EXTENSIONES = { pdf: "pdf", docx: "docx", txt: "txt", text: "txt", md: "md", markdown: "md", doc: "doc", odt: "otro", rtf: "otro", pages: "otro" };

  function tipoDeArchivo(nombre) {
    const m = /\.([a-z0-9]+)$/i.exec(String(nombre || ""));
    return m ? EXTENSIONES[m[1].toLowerCase()] || null : null;
  }
  const sinExtension = n => String(n || "Informe").replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").trim().slice(0, 120) || "Informe";
  const limpia = s => String(s || "").replace(/[  -​ \t ]+/g, " ").trim();
  const cuentaPalabras = s => (String(s).match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g) || []).length;
  const cuentaLetras = s => (String(s).match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;

  // Bloques [{ titulo: bool, texto }] → texto (un párrafo por línea) + lista de títulos
  function componer(bloques) {
    const lineas = [], titulos = [];
    for (const b of bloques) {
      const t = limpia(b.texto);
      if (!t) continue;
      if (b.titulo) {
        if (lineas.length) lineas.push("");
        if (!titulos.includes(t)) titulos.push(t);
      }
      lineas.push(t);
    }
    return { texto: lineas.join("\n"), titulos };
  }

  // Une las líneas partidas a mano (texto ajustado a un ancho fijo): la línea
  // no acaba en signo de puntuación y la siguiente empieza en minúscula.
  function unirPartidas(lineas) {
    const out = [];
    for (const l of lineas) {
      const prev = out.length ? out[out.length - 1] : "";
      if (l && prev && !/[.!?…;:]$/.test(prev) && /^[a-záéíóúüñ0-9]/.test(l) && !/^\d+[.)]\s/.test(l)) {
        out[out.length - 1] = /[a-záéíóúüñ]-$/i.test(prev) ? prev.slice(0, -1) + l : prev + " " + l;
      } else out.push(l);
    }
    return out;
  }

  // ---------- TXT ----------
  function decodificar(bytes) {
    const utf8 = new TextDecoder("utf-8").decode(bytes);
    if (!utf8.includes("�")) return utf8;
    try { return new TextDecoder("windows-1252").decode(bytes); } catch (e) { return utf8; }
  }

  function deTexto(txt) {
    const lineas = String(txt || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n").map(limpia);
    return { texto: unirPartidas(lineas).join("\n").replace(/\n{3,}/g, "\n\n").trim(), titulos: [] };
  }

  // ---------- Markdown ----------
  function mdEnLinea(s) {
    return String(s)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")                    // imágenes
      .replace(/\[\^[^\]]+\]/g, "")                            // llamadas a notas
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")                 // enlaces
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")                // enlaces por referencia
      .replace(/<(https?:\/\/[^>]+)>/g, "$1")
      .replace(/<\/?[a-z][^>]*>/gi, "")                        // etiquetas HTML
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "$1")
      .replace(/(?<![\w*])\*(?=\S)([^*]*?\S)\*(?![\w*])/g, "$1")
      .replace(/(?<![\w])_(?=\S)([^_]*?\S)_(?![\w])/g, "$1")
      .replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, "$1");
  }

  function deMarkdown(md) {
    let t = String(md || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    t = t.replace(/^---\n[\s\S]*?\n---\n/, "")                                   // cabecera YAML
      .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm, "")      // bloques de código
      .replace(/<!--[\s\S]*?-->/g, "");
    const ls = t.split("\n");
    const bloques = [];
    let seguir = false;                    // la línea anterior era texto de párrafo (se une a la siguiente)
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i], sig = ls[i + 1] || "";
      let m;
      if (!l.trim()) { seguir = false; continue; }
      if (/^\s*\[[^\]]+\]:\s+\S/.test(l)) { seguir = false; continue; }            // definición de referencia
      if ((m = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(l))) { bloques.push({ titulo: true, texto: mdEnLinea(m[2]) }); seguir = false; continue; }
      if (/^ {0,3}(=+|-{2,})\s*$/.test(sig) && !/^\s*([-*+]|\d+[.)])\s/.test(l) && !/^\s*>/.test(l)) {
        if (seguir) bloques.pop();         // título subrayado: la línea entera es el título
        bloques.push({ titulo: true, texto: mdEnLinea(l) }); i++; seguir = false; continue;
      }
      if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(l)) { seguir = false; continue; }  // raya horizontal
      if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l)) continue;   // separador de tabla
      if (/\|/.test(l) && /^\s*\|/.test(l)) {                                      // fila de tabla: cada celda, una frase
        const celdas = l.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => mdEnLinea(c).trim()).filter(Boolean);
        bloques.push({ titulo: false, texto: celdas.join("; ") }); seguir = false; continue;
      }
      let txt = l.replace(/^\s*(>\s?)+/, "");
      const lista = /^\s*([-*+•]|\d+[.)])\s+(\[[ xX]\]\s+)?/.exec(txt);
      if (lista) { txt = txt.slice(lista[0].length); seguir = false; }
      txt = mdEnLinea(txt).trim();
      if (!txt) continue;
      if (seguir && bloques.length) {
        const p = bloques[bloques.length - 1];
        p.texto = /[a-záéíóúüñ]-$/i.test(p.texto) ? p.texto.slice(0, -1) + txt : p.texto + " " + txt;
      } else bloques.push({ titulo: false, texto: txt });
      // Un salto forzado (dos espacios o «\» al final) corta el párrafo
      seguir = !/( {2,}|\\)$/.test(l);
    }
    return componer(bloques);
  }

  // ---------- ZIP (para DOCX) ----------
  async function inflar(datos) {
    if (typeof DecompressionStream === "undefined") throw new Error("Este navegador no puede abrir archivos Word. Actualízalo, o copia el texto y pégalo.");
    const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  }

  function leerZip(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let fin = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    if (fin < 0) throw new Error("El archivo no parece un Word (.docx) válido.");
    const entradas = new Map();
    let p = dv.getUint32(fin + 16, true);
    const n = dv.getUint16(fin + 10, true);
    for (let k = 0; k < n && p + 46 <= bytes.length && dv.getUint32(p, true) === 0x02014b50; k++) {
      const lnom = dv.getUint16(p + 28, true), lext = dv.getUint16(p + 30, true), lcom = dv.getUint16(p + 32, true);
      const nombre = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + lnom));
      entradas.set(nombre, { metodo: dv.getUint16(p + 10, true), comp: dv.getUint32(p + 20, true), local: dv.getUint32(p + 42, true) });
      p += 46 + lnom + lext + lcom;
    }
    async function leer(nombre) {
      const e = entradas.get(nombre);
      if (!e) return null;
      const ini = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
      const datos = bytes.subarray(ini, ini + e.comp);
      if (e.metodo === 0) return datos;
      if (e.metodo === 8) return inflar(datos);
      throw new Error("El Word usa una compresión que la app no conoce. Guárdalo de nuevo como .docx o copia el texto.");
    }
    return { nombres: [...entradas.keys()], leer, texto: async nombre => { const b = await leer(nombre); return b ? new TextDecoder("utf-8").decode(b) : null; } };
  }

  // ---------- DOCX ----------
  const xmlTexto = s => String(s).replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === "#") return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" }[k];
  });
  const RE_NOMBRE_TITULO = /^(heading|t[ií]tulo|titulo|ttulo|title|encabezado)\s*\d*$/i;

  // Estilos de párrafo que son títulos: por nombre (Heading 1, Título 1, Title)
  // o por nivel de esquema (w:outlineLvl 0–8)
  function estilosDeTitulo(stylesXml) {
    const ids = new Set();
    for (const m of String(stylesXml || "").matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g)) {
      if (!/w:type="paragraph"/.test(m[1])) continue;
      const id = (/w:styleId="([^"]+)"/.exec(m[1]) || [])[1];
      const nombre = xmlTexto((/<w:name w:val="([^"]+)"/.exec(m[2]) || [])[1] || "");
      const nivel = (/<w:outlineLvl w:val="(\d+)"/.exec(m[2]) || [])[1];
      if (id && (RE_NOMBRE_TITULO.test(nombre) || RE_NOMBRE_TITULO.test(id) || (nivel != null && +nivel < 9))) ids.add(id);
    }
    return ids;
  }

  function docxXml(documentXml, stylesXml) {
    const estilos = estilosDeTitulo(stylesXml);
    const xml = String(documentXml || "")
      .replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, "")      // contenido duplicado para versiones antiguas
      .replace(/<w:del\b(?:[^>]*[^\/>])?>[\s\S]*?<\/w:del>/g, "");                // texto tachado en control de cambios
    const bloques = [];
    for (const m of xml.matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)) {
      const cuerpo = m[1] || "";
      const ppr = (/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/.exec(cuerpo) || [])[1] || "";
      const estilo = (/<w:pStyle w:val="([^"]+)"/.exec(ppr) || [])[1];
      const nivel = (/<w:outlineLvl w:val="(\d+)"/.exec(ppr) || [])[1];
      const titulo = (estilo && (estilos.has(estilo) || RE_NOMBRE_TITULO.test(estilo))) || (nivel != null && +nivel < 9);
      let texto = "";
      const runs = cuerpo.replace(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/, "");
      for (const r of runs.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(?:tab|br|cr)\b[^>]*\/>|<w:noBreakHyphen\/>/g)) {
        if (r[1] != null) texto += xmlTexto(r[1]);
        else texto += r[0].startsWith("<w:noBreakHyphen") ? "-" : " ";
      }
      bloques.push({ titulo: !!titulo, texto });
    }
    return componer(bloques);
  }

  async function deDocx(bytes) {
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw new Error("Es un Word antiguo (.doc). Ábrelo en Word y guárdalo como .docx, o copia el texto y pégalo.");
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("El archivo no parece un Word (.docx) válido.");
    const zip = leerZip(bytes);
    const doc = await zip.texto("word/document.xml");
    if (!doc) throw new Error("El archivo no parece un Word (.docx) válido.");
    return docxXml(doc, await zip.texto("word/styles.xml"));
  }

  // ---------- PDF ----------
  // paginas: [[{ texto, alto, y }]] (una entrada por línea, de arriba abajo)
  const clavePdf = t => t.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
  const RE_NUM_PAGINA = /^(p[áa]g(ina)?\.?\s*)?\d+(\s*(de|\/)\s*\d+)?$/i;
  const RE_VINETA = /^([•·▪◦●○■□\-–—*]|\d+[.)]|[a-z][.)])\s/;

  function dePdf(paginas) {
    paginas = (paginas || []).map(ls => (ls || []).map(l => ({ texto: limpia(l.texto), alto: +l.alto || 0, y: +l.y || 0 })).filter(l => l.texto));
    const letras = paginas.reduce((a, ls) => a + ls.reduce((b, l) => b + cuentaLetras(l.texto), 0), 0);
    const escaneado = letras < 30 * Math.max(1, paginas.length);
    // Cabeceras y pies que se repiten en muchas páginas, y números de página
    const veces = new Map();
    paginas.forEach(ls => new Set(ls.map(l => clavePdf(l.texto))).forEach(k => veces.set(k, (veces.get(k) || 0) + 1)));
    const repetida = k => paginas.length >= 3 && veces.get(k) >= Math.max(3, paginas.length * 0.5);
    const todas = [];
    paginas.forEach((ls, pag) => ls.forEach(l => { if (!RE_NUM_PAGINA.test(l.texto) && !repetida(clavePdf(l.texto))) todas.push(Object.assign({ pag }, l)); }));
    // Tamaño de letra del cuerpo: el que más texto ocupa
    const pesos = new Map();
    for (const l of todas) { const k = Math.round(l.alto * 2) / 2; pesos.set(k, (pesos.get(k) || 0) + l.texto.length); }
    const cuerpo = [...pesos.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0])[0] || 0;
    // Separación habitual entre dos líneas seguidas del cuerpo (sin pasar de 1,4 veces la letra)
    const deCuerpo = l => Math.abs(l.alto - cuerpo) < 0.5;
    const saltos = [];
    for (let i = 1; i < todas.length; i++) {
      const g = todas[i - 1].y - todas[i].y;
      if (todas[i].pag === todas[i - 1].pag && deCuerpo(todas[i]) && deCuerpo(todas[i - 1]) && g > 0 && g < cuerpo * 4) saltos.push(g);
    }
    saltos.sort((a, b) => a - b);
    const salto = Math.min(saltos.length ? saltos[Math.floor(saltos.length * 0.3)] : cuerpo * 1.2, cuerpo * 1.4);
    const bloques = [];
    let prev = null;
    for (const l of todas) {
      const esTitulo = cuerpo > 0 && l.alto >= cuerpo * 1.15 && cuentaPalabras(l.texto) <= 15 && !/[.,;]$/.test(l.texto);
      const ult = bloques[bloques.length - 1];
      const g = prev && prev.pag === l.pag ? prev.y - l.y : null;
      if (ult && esTitulo && ult.titulo && g != null && g > 0 && g <= l.alto * 1.8) ult.texto += " " + l.texto;   // título en dos líneas
      else if (ult && !esTitulo && !ult.titulo && !RE_VINETA.test(l.texto) && !/:$/.test(ult.texto) &&
        (g != null ? g > 0 && g <= salto * 1.5 : !/[.!?…]$/.test(ult.texto))) {
        ult.texto = /[a-záéíóúüñ]-$/i.test(ult.texto) && /^[a-záéíóúüñ]/.test(l.texto) ? ult.texto.slice(0, -1) + l.texto : ult.texto + " " + l.texto;
      } else bloques.push({ titulo: esTitulo, texto: l.texto });
      prev = l;
    }
    return Object.assign(componer(bloques), { escaneado, paginas: paginas.length });
  }

  // Extrae las líneas de cada página con pdf.js (solo en el navegador)
  async function lineasDePdf(bytes, pdfjs) {
    const tarea = pdfjs.getDocument({ data: bytes, disableFontFace: true, enableXfa: false, verbosity: 0 });
    const paginas = [];
    try {
      const doc = await tarea.promise;
      for (let n = 1; n <= doc.numPages; n++) {
        const pagina = await doc.getPage(n);
        const tc = await pagina.getTextContent();
        const lineas = [];
        let actual = null;
        for (const it of tc.items) {
          if (typeof it.str !== "string") continue;
          const y = it.transform[5], alto = Math.hypot(it.transform[2], it.transform[3]) || it.height || 0;
          if (!actual || Math.abs(y - actual.y) > Math.max(2, 0.5 * (alto || actual.alto))) { actual = { texto: "", alto: 0, y }; lineas.push(actual); }
          actual.texto += it.str;
          if (it.str.trim()) actual.alto = Math.max(actual.alto, alto);
          if (it.hasEOL) actual = null;
        }
        paginas.push(lineas);
        pagina.cleanup();
      }
    } finally { tarea.destroy(); }
    return paginas;
  }

  let pdfjsPromesa = null;
  function cargarPdfjs() {
    if (!pdfjsPromesa) pdfjsPromesa = import(PDFJS + "pdf.min.mjs").then(m => { m.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs"; return m; })
      .catch(e => { pdfjsPromesa = null; throw new Error("No se ha podido cargar el lector de PDF. Actualiza el navegador, o copia el texto y pégalo."); });
    return pdfjsPromesa;
  }

  // ---------- Entrada única: un File del navegador ----------
  async function leerArchivo(archivo) {
    const nombre = archivo && archivo.name || "";
    const tipo = tipoDeArchivo(nombre);
    if (tipo === "doc") throw new Error("Es un Word antiguo (.doc). Ábrelo en Word y guárdalo como .docx, o copia el texto y pégalo.");
    if (!tipo || tipo === "otro") throw new Error(`No puedo leer «${nombre}». Sube un PDF, un Word (.docx), un TXT o un MD.`);
    if (!archivo.size) throw new Error("El archivo está vacío.");
    if (archivo.size > MAX_BYTES) throw new Error(`El archivo ocupa ${(archivo.size / 1048576).toFixed(1).replace(".", ",")} MB y el límite es ${MAX_BYTES / 1048576} MB. Sube solo la parte que quieres revisar o copia el texto.`);
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    let r;
    if (tipo === "txt") r = deTexto(decodificar(bytes));
    else if (tipo === "md") r = deMarkdown(decodificar(bytes));
    else if (tipo === "docx") r = await deDocx(bytes);
    else {
      const pdfjs = await cargarPdfjs();
      try { r = dePdf(await lineasDePdf(bytes, pdfjs)); }
      catch (e) {
        if (e && e.name === "PasswordException") throw new Error("El PDF está protegido con contraseña. Quítale la protección o copia el texto.");
        throw new Error("No se ha podido abrir el PDF. Puede estar dañado; prueba a copiar el texto y pegarlo.");
      }
      if (r.escaneado) throw new Error("Este PDF no tiene texto que se pueda leer: parece escaneado (es una imagen de las páginas). Copia el texto y pégalo, o usa el PDF original con texto, el que genera el programa con el que se escribió.");
    }
    if (!cuentaPalabras(r.texto)) throw new Error("No he encontrado texto en el archivo.");
    let recortado = false;
    if (r.texto.length > MAX_CARACTERES) {
      const corte = r.texto.lastIndexOf("\n", MAX_CARACTERES);
      r.texto = r.texto.slice(0, corte > 0 ? corte : MAX_CARACTERES); recortado = true;
      r.titulos = r.titulos.filter(t => r.texto.includes(t));
    }
    return { texto: r.texto, titulos: r.titulos, tipo, titulo: sinExtension(nombre), paginas: r.paginas || null, recortado };
  }

  const API = { MAX_BYTES, MAX_CARACTERES, tipoDeArchivo, sinExtension, componer, unirPartidas, decodificar, deTexto, deMarkdown, leerZip, estilosDeTitulo, docxXml, deDocx, dePdf, lineasDePdf, cargarPdfjs, leerArchivo };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.Lector = API;
})(typeof window !== "undefined" ? window : globalThis);
