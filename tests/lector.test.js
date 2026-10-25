// Pruebas de la lectura de informes y del análisis por apartados. Uso: node tests/lector.test.js
// Los archivos de tests/ejemplos/ son inventados (sin datos reales); se regeneran con generar.py.
const fs = require("fs"), path = require("path");
const Lector = require("../lector.js");
const L = require("../logic.js");
const EJ = path.join(__dirname, "ejemplos");
let ok = 0, mal = 0;
function prueba(nombre, cond, info) {
  if (cond) ok++; else { mal++; console.log("✗", nombre, info === undefined ? "" : JSON.stringify(info)); }
}
const APARTADOS = ["Qué le hemos hecho", "Cómo cuidar la herida", "Cuándo volver a Urgencias"];
const TITULO = "Cuidados de la herida después de la operación";

(async () => {
  // ---- Tipo de archivo y nombre ----
  prueba("tipo pdf", Lector.tipoDeArchivo("Alta.PDF") === "pdf");
  prueba("tipo docx", Lector.tipoDeArchivo("hoja.docx") === "docx");
  prueba("tipo md y markdown", Lector.tipoDeArchivo("a.md") === "md" && Lector.tipoDeArchivo("a.markdown") === "md");
  prueba("tipo txt", Lector.tipoDeArchivo("a.txt") === "txt");
  prueba("tipo doc antiguo", Lector.tipoDeArchivo("a.doc") === "doc");
  prueba("tipo desconocido", Lector.tipoDeArchivo("foto.jpg") === null && Lector.tipoDeArchivo("sin-extension") === null);
  prueba("título desde el nombre", Lector.sinExtension("hoja_de_alta.docx") === "hoja de alta");

  // ---- TXT ----
  const txt = Lector.deTexto(fs.readFileSync(path.join(EJ, "informe-ejemplo.txt"), "utf8"));
  prueba("txt: une las líneas partidas", txt.texto.includes("realizada mediante abordaje anterior con colocación de malla protésica"));
  prueba("txt: une la línea que empieza por número", txt.texto.includes("fiebre de más de 38 grados"));
  prueba("txt: no une frases terminadas", txt.texto.includes("ha ido bien.\n"));
  prueba("txt: sin títulos marcados", txt.titulos.length === 0);
  prueba("txt: apartados por la forma de los títulos", JSON.stringify(L.apartados(txt.texto).map(a => a.titulo)) === JSON.stringify(APARTADOS), L.apartados(txt.texto).map(a => a.titulo));
  prueba("txt: no une un elemento numerado", Lector.deTexto("Haga esto\n1. Primero\n2. Después").texto === "Haga esto\n1. Primero\n2. Después");
  prueba("txt: quita el guion de final de línea", Lector.deTexto("medica-\nmento").texto === "medicamento");
  const latin1 = Uint8Array.from([0x4c, 0xe1, 0x76, 0x65, 0x73, 0x65]);   // «Lávese» en Windows-1252
  prueba("txt: lee Windows-1252", Lector.decodificar(latin1) === "Lávese");
  prueba("txt: lee UTF-8", Lector.decodificar(new TextEncoder().encode("Lávese")) === "Lávese");

  // ---- Markdown ----
  const md = Lector.deMarkdown(fs.readFileSync(path.join(EJ, "informe-ejemplo.md"), "utf8"));
  prueba("md: títulos # y subrayados", JSON.stringify(md.titulos) === JSON.stringify([TITULO, ...APARTADOS]), md.titulos);
  prueba("md: quita negritas y enlaces", md.texto.includes("Lávese las manos antes") && md.texto.includes("con una toalla limpia, sin frotar") && !/[*\[\]()]/.test(md.texto.replace(/\(|\)/g, "")), md.texto);
  prueba("md: quita la cabecera YAML", !md.texto.includes("autor"));
  prueba("md: quita los bloques de código", !md.texto.includes("codigo"));
  prueba("md: une las líneas del párrafo", md.texto.includes("debiendo evitarse la realización de esfuerzos"));
  prueba("md: cada elemento de lista en su línea", md.texto.includes("herida.\nPuede ducharse"));
  prueba("md: tabla en celdas", md.texto.includes("Día; Qué hacer\n1; Descansar"));
  prueba("md: sin almohadillas", !md.texto.includes("#"));
  const md2 = Lector.deMarkdown("Texto con `código`, *cursiva*, ~~tachado~~ y una_variable.\n\n> Cita\n\n![foto](a.png)\n\n---\n\n## Fin ##");
  prueba("md: marcas en línea", md2.texto === "Texto con código, cursiva, tachado y una_variable.\nCita\n\nFin", md2.texto);
  prueba("md: título con # de cierre", md2.titulos[0] === "Fin");

  // ---- DOCX ----
  const docx = await Lector.deDocx(new Uint8Array(fs.readFileSync(path.join(EJ, "informe-ejemplo.docx"))));
  prueba("docx: títulos por estilo (Title, Título 1 con id «Ttulo1», Heading 2)", JSON.stringify(docx.titulos) === JSON.stringify([TITULO, ...APARTADOS]), docx.titulos);
  prueba("docx: conserva los párrafos", docx.texto.includes("ha ido bien.\nTras la intervención"));
  prueba("docx: une las partes de un párrafo", docx.texto.includes("realizada mediante abordaje anterior con colocación"));
  prueba("docx: ignora el texto borrado con control de cambios", !docx.texto.includes("BORRADO"));
  prueba("docx: lee las tablas y los tabuladores", docx.texto.includes("Teléfono del centro\n957 000 000"));
  prueba("docx: sin restos de XML", !/[<>]/.test(docx.texto));
  prueba("docx: apartados", JSON.stringify(L.apartados(docx.texto, docx.titulos).map(a => a.titulo)) === JSON.stringify(APARTADOS));
  const x = Lector.docxXml('<w:body><w:p><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:r><w:t>Uno &amp; dos</w:t></w:r></w:p><w:p><w:r><w:t>A</w:t><w:br/><w:t>B&#225;</w:t></w:r></w:p></w:body>', "");
  prueba("docx: título por nivel de esquema y entidades XML", x.titulos[0] === "Uno & dos" && x.texto === "Uno & dos\nA Bá", x);
  prueba("docx: estilos de título", [...Lector.estilosDeTitulo('<w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="heading 2"/></w:style><w:style w:type="paragraph" w:styleId="Cita"><w:name w:val="Quote"/></w:style><w:style w:type="character" w:styleId="Ttulo1Car"><w:name w:val="Título 1 Car"/></w:style>')].join() === "Ttulo2");
  let err = null;
  try { await Lector.deDocx(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0])); } catch (e) { err = e.message; }
  prueba("docx: avisa del .doc antiguo", /antiguo/.test(err || ""), err);
  err = null;
  try { await Lector.deDocx(new TextEncoder().encode("hola")); } catch (e) { err = e.message; }
  prueba("docx: avisa si no es un Word", /no parece/.test(err || ""), err);

  // ---- PDF: líneas → párrafos y títulos (sin pdf.js) ----
  const lin = (texto, y, alto = 11) => ({ texto, y, alto });
  const sint = Lector.dePdf([
    [lin("Cabecera del centro", 800, 9), lin("Hoja de ejemplo", 760, 16), lin("Primera línea de un párrafo que se", 730), lin("parte en dos líneas y acaba aquí.", 716), lin("Otro párrafo con un medica-", 690), lin("mento partido.", 676), lin("Vuelva si:", 650), lin("• tiene fiebre", 636), lin("• le duele", 622), lin("1", 40, 9)],
    [lin("Cabecera del centro", 800, 9), lin("Segundo apartado", 760, 16), lin("con título en dos líneas", 742, 16), lin("Texto del segundo", 712), lin("apartado que sigue en la", 698), lin("2", 40, 9)],
    [lin("Cabecera del centro", 800, 9), lin("página siguiente.", 760), lin("Página 3 de 3", 40, 9)]
  ]);
  prueba("pdf: títulos por tamaño de letra", JSON.stringify(sint.titulos) === JSON.stringify(["Hoja de ejemplo", "Segundo apartado con título en dos líneas"]), sint.titulos);
  prueba("pdf: une las líneas de un párrafo", sint.texto.includes("Primera línea de un párrafo que se parte en dos líneas y acaba aquí."));
  prueba("pdf: quita el guion partido", sint.texto.includes("con un medicamento partido."));
  prueba("pdf: viñetas en su línea", sint.texto.includes("Vuelva si:\n• tiene fiebre\n• le duele"));
  prueba("pdf: quita cabeceras repetidas y números de página", !/Cabecera|Página|\n[123]\n|\n[123]$/.test(sint.texto), sint.texto);
  prueba("pdf: párrafo que sigue en otra página", sint.texto.includes("Texto del segundo apartado que sigue en la página siguiente."), sint.texto);
  prueba("pdf: no es escaneado", !sint.escaneado && sint.paginas === 3);
  prueba("pdf: sin texto = escaneado", Lector.dePdf([[], [lin("1", 40, 9)]]).escaneado === true);

  // ---- PDF de ejemplo con pdf.js (copia local en vendor/) ----
  try {
    const pdfjs = await import(path.join(__dirname, "..", "vendor", "pdfjs-6.4.299", "pdf.min.mjs"));
    pdfjs.GlobalWorkerOptions.workerSrc = path.join(__dirname, "..", "vendor", "pdfjs-6.4.299", "pdf.worker.min.mjs");
    const pdf = Lector.dePdf(await Lector.lineasDePdf(new Uint8Array(fs.readFileSync(path.join(EJ, "informe-ejemplo.pdf"))), pdfjs));
    prueba("pdf.js: títulos", JSON.stringify(pdf.titulos) === JSON.stringify([TITULO, ...APARTADOS]), pdf.titulos);
    prueba("pdf.js: mismo texto que el Word", pdf.texto === docx.texto.replace("\nTeléfono del centro\n957 000 000", ""), pdf.texto);
    const esc = Lector.dePdf(await Lector.lineasDePdf(new Uint8Array(fs.readFileSync(path.join(EJ, "informe-escaneado.pdf"))), pdfjs));
    prueba("pdf.js: detecta el PDF escaneado", esc.escaneado === true);
  } catch (e) { mal++; console.log("✗ pdf.js no se ha podido usar en Node:", e.message); }

  // ---- Apartados y párrafos difíciles ----
  const r = L.analizarApartados(docx.texto, docx.titulos);
  prueba("apartados: tres, con título", r.conTitulos && r.apartados.length === 3);
  prueba("apartados: el título principal no es un apartado vacío", !r.apartados.some(a => a.titulo === TITULO));
  prueba("apartados: el más difícil es el de la operación", r.peor && r.peor.titulo === "Qué le hemos hecho");
  prueba("apartados: el título no cuenta dentro del apartado", r.apartados[1].analisis.palabras === L.analizar(r.apartados[1].parrafos.join("\n")).palabras && !r.apartados[1].parrafos.includes("Cómo cuidar la herida"));
  prueba("párrafos difíciles: el técnico, primero", r.dificiles.length >= 1 && r.dificiles[0].texto.startsWith("Tras la intervención") && r.dificiles[0].apartado === "Qué le hemos hecho");
  prueba("párrafos difíciles: solo los que no llegan a 55", r.dificiles.every(d => !d.analisis.supera));
  prueba("párrafos difíciles: ordenados de peor a mejor", r.dificiles.every((d, i) => !i || r.dificiles[i - 1].analisis.ifsz <= d.analisis.ifsz));
  prueba("apartados: el veredicto global no cambia", L.analizar(docx.texto).ifsz === L.diagnostico(docx.texto).analisis.ifsz);
  const sin = L.analizarApartados("Una frase normal y corriente.\nOtra frase más.");
  prueba("sin títulos: un solo apartado", !sin.conTitulos && sin.apartados.length === 1 && sin.apartados[0].titulo === "Todo el texto");
  prueba("títulos conocidos que ya no están: se reconocen por la forma", L.apartados("¿Qué hacer?\nDescanse.\n¿Cuándo volver?\nSi hay fiebre.", ["Otro título"]).length === 2);
  prueba("título: pregunta corta", L.pareceTitulo("¿Qué puede hacer?", false, true));
  prueba("título: mayúsculas", L.pareceTitulo("CUIDADOS EN CASA", false, true));
  prueba("título: numerado", L.pareceTitulo("2. Cuidados de la herida", false, true));
  prueba("título: tras línea en blanco", L.pareceTitulo("Cómo cuidar la herida", true, true));
  prueba("no título: frase con punto", !L.pareceTitulo("Descanse en casa.", true, true));
  prueba("no título: viñeta", !L.pareceTitulo("- tome agua", true, true));
  prueba("no título: última línea", !L.pareceTitulo("¿Tiene dudas?", true, false));
  prueba("no título: línea larga", !L.pareceTitulo("Una línea sin punto pero con muchas más palabras de las que tendría nunca un título", true, true));
  prueba("no título: línea seguida sin blanco ni señal", !L.pareceTitulo("Cómo cuidar la herida", false, true));
  const ej = require("../contenido.js").EJEMPLOS[1];
  prueba("ejemplo «después»: dos apartados con preguntas", L.analizarApartados(ej.texto).apartados.length === 2);

  // ---- Informe con apartados y textos guardados con títulos ----
  const inf = L.documentoInforme("Ejemplo", docx.texto, "25/10/2026", docx.titulos);
  prueba("informe: incluye «Por apartados»", inf.bloques.some(b => b.t === "h1" && b.texto === "Por apartados"));
  prueba("informe: incluye «Párrafos más difíciles»", inf.bloques.some(b => b.t === "h1" && b.texto === "Párrafos más difíciles"));
  prueba("informe sin títulos: sin «Por apartados»", !L.documentoInforme("x", "Hola. Adiós.").bloques.some(b => b.texto === "Por apartados"));
  const san = L.sanear({ textos: [{ id: "a", titulo: "t", texto: "x", titulos: ["Uno", 3, "Dos"] }, { id: "b", texto: "y" }] });
  prueba("sanear: conserva los títulos", JSON.stringify(san.textos[0].titulos) === '["Uno","Dos"]' && !("titulos" in san.textos[1]));

  console.log(`\n${ok} correctas, ${mal} fallidas`);
  process.exit(mal ? 1 : 0);
})();
