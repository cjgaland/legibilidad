// ============================================================
//  docx.js — Documentos Word (.docx) reales sin dependencias · Legibilidad (copiado de Auditorías)
//  Mismo enfoque que xlsx.js: OOXML escrito a mano y empaquetado en un ZIP
//  sin compresión (usa Xlsx.zipStore). Convierte la lista de «bloques» que
//  generan logic.js (documentoPlan, documentoMapa…) en un .docx editable.
//  window.Docx en navegador y module.exports en Node (tests).
//
//  Bloques: {t:"portada", titulo, sub, extra:[…]} · {t:"h1"|"h2", texto} ·
//  {t:"p", texto | runs:[{texto, negrita, cursiva, color}], estilo:"nota"} ·
//  {t:"lista", items:[texto]} · {t:"salto"} ·
//  {t:"tabla", cab:[…], filas:[[celda]], anchos:[pesos], fuente:pt, sinCab}
//  Celda: texto o {texto, negrita, centro, fondo:"RRGGBB", color}
// ============================================================
(function (raiz) {
  "use strict";
  const Z = typeof module !== "undefined" && module.exports ? require("./xlsx.js") : raiz.Xlsx;

  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const COLOR = "0369A1";           // azul de Legibilidad
  const A4 = { w: 11906, h: 16838, m: 1134 }; // twips (A4, márgenes de 2 cm)

  // Un texto con saltos de línea se convierte en runs separados por <w:br/>
  function run(r, base = {}) {
    const o = Object.assign({}, base, r);
    const pr = [o.negrita ? "<w:b/>" : "", o.cursiva ? "<w:i/>" : "", o.color ? `<w:color w:val="${o.color}"/>` : "", o.tam ? `<w:sz w:val="${o.tam * 2}"/><w:szCs w:val="${o.tam * 2}"/>` : ""].join("");
    return String(o.texto == null ? "" : o.texto).split("\n").map((t, i) => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ""}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`).join("");
  }
  const runs = (b, base) => (b.runs || [{ texto: b.texto }]).map(r => run(r, base)).join("");
  function parrafo(contenido, o = {}) {
    // El orden de los hijos de <w:pPr> lo fija el estándar (Word y LibreOffice ignoran lo que va fuera de orden)
    const pPr = [o.estilo ? `<w:pStyle w:val="${o.estilo}"/>` : "", o.keepNext ? "<w:keepNext/>" : "", o.esp ? `<w:spacing w:before="${o.esp[0]}" w:after="${o.esp[1]}"/>` : "", o.sangria ? `<w:ind w:left="${o.sangria}" w:hanging="240"/>` : "", o.centro ? '<w:jc w:val="center"/>' : ""].join("");
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${contenido}</w:p>`;
  }

  function tabla(b, ancho) {
    const pesos = b.anchos && b.anchos.length ? b.anchos : (b.cab || b.filas[0] || [1]).map(() => 1);
    const suma = pesos.reduce((a, x) => a + x, 0), cols = pesos.map(p => Math.round(ancho * p / suma));
    const tam = b.fuente || 9;
    const celda = (c, w, cab) => {
      const o = typeof c === "object" && c !== null ? c : { texto: c };
      const fondo = cab ? COLOR : o.fondo;
      const tcPr = `<w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${fondo}"/>` : ""}</w:tcPr>`;
      const base = { tam, negrita: cab || o.negrita, color: cab ? "FFFFFF" : o.color };
      return `<w:tc>${tcPr}${parrafo(run({ texto: o.texto }, base), { estilo: "Celda", centro: o.centro })}</w:tc>`;
    };
    const filaXml = (f, cab) => `<w:tr><w:trPr><w:cantSplit/>${cab ? "<w:tblHeader/>" : ""}</w:trPr>${cols.map((w, i) => celda(f[i] == null ? "" : f[i], w, cab)).join("")}</w:tr>`;
    return `<w:tbl><w:tblPr><w:tblStyle w:val="TablaApp"/><w:tblW w:w="${ancho}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>`
      + `<w:tblGrid>${cols.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`
      + (b.sinCab || !b.cab ? "" : filaXml(b.cab, true))
      + b.filas.map(f => filaXml(f, false)).join("") + "</w:tbl>" + parrafo("", { esp: [0, 120] });
  }

  function cuerpo(bloques, ancho) {
    return bloques.map(b => {
      switch (b.t) {
        case "portada": return parrafo(run({ texto: b.titulo }), { estilo: "Title" })
          + (b.sub ? parrafo(run({ texto: b.sub }), { estilo: "Subtitle" }) : "")
          + (b.extra || []).map(x => parrafo(run({ texto: x, color: "444444" }), { esp: [0, 40] })).join("")
          + parrafo("", { esp: [0, 200] });
        case "h1": return parrafo(run({ texto: b.texto }), { estilo: "Heading1" });
        case "h2": return parrafo(run({ texto: b.texto }), { estilo: "Heading2" });
        case "p": return parrafo(runs(b, b.estilo === "nota" ? { cursiva: true, color: "555555", tam: 9 } : {}), {});
        case "lista": return b.items.map(it => parrafo(run({ texto: "•\t" }) + (typeof it === "string" ? run({ texto: it }) : runs(it)), { sangria: 360 })).join("");
        case "salto": return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        case "tabla": return tabla(b, ancho);
        default: return "";
      }
    }).join("");
  }

  const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="1200" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="6" w:color="${COLOR}"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="0D1B2A"/><w:sz w:val="52"/><w:szCs w:val="52"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="${COLOR}"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="${COLOR}"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="134E4A"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Celda"><w:name w:val="Celda"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="666666"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TablaApp"><w:name w:val="Tabla Auditorías"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B8D4DC"/><w:left w:val="single" w:sz="4" w:color="B8D4DC"/><w:bottom w:val="single" w:sz="4" w:color="B8D4DC"/><w:right w:val="single" w:sz="4" w:color="B8D4DC"/><w:insideH w:val="single" w:sz="4" w:color="B8D4DC"/><w:insideV w:val="single" w:sz="4" w:color="B8D4DC"/></w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

  /** Construye el .docx. doc = { titulo, bloques, pie, horizontal } → Uint8Array */
  function construirDocx(doc) {
    const enc = new TextEncoder();
    const hz = !!doc.horizontal, w = hz ? A4.h : A4.w, h = hz ? A4.w : A4.h, ancho = w - 2 * A4.m;
    const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="${w}" w:h="${h}"${hz ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${A4.m}" w:right="${A4.m}" w:bottom="${A4.m}" w:left="${A4.m}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
    const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${ns}><w:body>${cuerpo(doc.bloques, ancho)}${sect}</w:body></w:document>`;
    const campo = c => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${c} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
    const pie = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:ftr ${ns}><w:p><w:pPr><w:pStyle w:val="Footer"/><w:tabs><w:tab w:val="right" w:pos="${ancho}"/></w:tabs></w:pPr>${run({ texto: doc.pie || doc.titulo || "" })}<w:r><w:tab/></w:r>${run({ texto: "Página " })}${campo("PAGE")}${run({ texto: " de " })}${campo("NUMPAGES")}</w:p></w:ftr>`;
    const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(doc.titulo || "")}</dc:title><dc:creator>App Legibilidad</dc:creator><dc:language>es-ES</dc:language></cp:coreProperties>`;
    return Z.zipStore([
      { name: "[Content_Types].xml", bytes: enc.encode(tipos) },
      { name: "_rels/.rels", bytes: enc.encode(rels) },
      { name: "word/document.xml", bytes: enc.encode(documento) },
      { name: "word/styles.xml", bytes: enc.encode(ESTILOS) },
      { name: "word/footer1.xml", bytes: enc.encode(pie) },
      { name: "word/_rels/document.xml.rels", bytes: enc.encode(docRels) },
      { name: "docProps/core.xml", bytes: enc.encode(core) }
    ]);
  }

  const API = { construirDocx };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.Docx = API;
})(typeof window !== "undefined" ? window : globalThis);
