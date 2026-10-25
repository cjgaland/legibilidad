// ============================================================
//  logic.js — Legibilidad INFLESZ · funciones puras (sin DOM)
//  window.Logica en navegador y module.exports en Node (tests).
//
//  Índice de Flesch-Szigriszt (IFSZ):
//    IFSZ = 206,835 − 62,3 × (sílabas / palabras) − (palabras / frases)
//  Escala INFLESZ (Barrio-Cantalejo et al., An Sist Sanit Navar 2008):
//    < 40 muy difícil · 40–55 algo difícil · 55–65 normal ·
//    65–80 bastante fácil · > 80 muy fácil. Recomendado: más de 55.
//  El recuento de sílabas es una aproximación por reglas del castellano
//  (diptongos, triptongos e hiatos con tilde); puede diferir en algún
//  punto del programa INFLESZ original.
// ============================================================
(function (raiz) {
  "use strict";

  const VERSION = "2026.02";
  const UMBRAL = 55;                 // recomendado para textos de salud
  const FRASE_LARGA = 20;            // palabras
  const PALABRA_LARGA = 5;           // sílabas
  const PARRAFO_MIN = 15;            // palabras para puntuar un párrafo suelto

  const TRAMOS = [
    { id: "muy-dificil", hasta: 40, nombre: "Muy difícil", color: "rojo" },
    { id: "algo-dificil", hasta: 55, nombre: "Algo difícil", color: "ambar" },
    { id: "normal", hasta: 65, nombre: "Normal", color: "verde" },
    { id: "bastante-facil", hasta: 80, nombre: "Bastante fácil", color: "verde" },
    { id: "muy-facil", hasta: Infinity, nombre: "Muy fácil", color: "verde" }
  ];

  // ---------- Sílabas ----------
  const FUERTES = "aeoáéíóú";        // las débiles con tilde (í, ú) hacen hiato: cuentan como fuertes
  const DEBILES = "iuü";
  const esVocal = c => FUERTES.includes(c) || DEBILES.includes(c);

  function silabas(palabra) {
    let p = String(palabra || "").toLowerCase().replace(/[^a-záéíóúüñ]/g, "");
    if (!p) return 0;
    if (p === "y") return 1;
    // «y» final tras vocal suena como vocal débil (hoy, muy, rey)
    if (/[aeiouáéíóú]y$/.test(p)) p = p.slice(0, -1) + "i";
    // «u» muda en que, qui, gue, gui (no en güe, güi)
    p = p.replace(/qu(?=[eiéí])/g, "q").replace(/gu(?=[eiéí])/g, "g");
    let n = 0, i = 0;
    while (i < p.length) {
      if (!esVocal(p[i])) { i++; continue; }
      let grupo = "";
      while (i < p.length && esVocal(p[i])) grupo += p[i++];
      const fuertes = [...grupo].filter(c => FUERTES.includes(c)).length;
      // Dos débiles iguales seguidas (antiinflamatorio, chiita) hacen hiato
      const dobles = (grupo.match(/ii|uu/g) || []).length;
      n += Math.max(1, fuertes) + (fuertes ? 0 : dobles);
    }
    return Math.max(1, n);
  }

  // ---------- Texto ----------
  const RE_PALABRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[-'’][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*|\d+(?:[.,]\d+)*/g;
  const ABREV = /\b(?:dr|dra|sr|sra|srta|ud|uds|etc|pág|págs|núm|aprox|tel|tlf|vol|fig|p\.\s?ej|ej)\.\s/gi;

  function normalizar(texto) {
    return String(texto || "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ");
  }

  // Frases: terminan en . ! ? … ; o en un salto de línea (listas y títulos)
  function frases(texto) {
    const t = normalizar(texto).replace(ABREV, m => m.replace(".", "\u0000"));
    return t.split(/(?<=[.!?…;])\s+|\n+/)
      .map(f => f.replace(/\u0000/g, ".").replace(/^[\s•·\-–—*]+/, "").trim())
      .filter(f => (f.match(RE_PALABRA) || []).length > 0);
  }

  function palabras(texto) { return String(texto || "").match(RE_PALABRA) || []; }

  // Los números cuentan como palabra; sus sílabas se estiman en 2 (como al leerlos en voz alta, aproximadamente)
  const silabasToken = w => /^\d/.test(w) ? 2 : silabas(w);

  function tramo(ifsz) {
    if (ifsz == null || !isFinite(ifsz)) return null;
    return TRAMOS.find(t => ifsz < t.hasta) || TRAMOS[TRAMOS.length - 1];
  }

  function indice(nSil, nPal, nFra) {
    if (!nPal || !nFra) return null;
    return 206.835 - 62.3 * (nSil / nPal) - (nPal / nFra);
  }

  function analizar(texto) {
    const fs = frases(texto);
    const detalle = fs.map(f => {
      const ws = palabras(f);
      return { texto: f, palabras: ws.length, silabas: ws.reduce((a, w) => a + silabasToken(w), 0) };
    });
    const nPal = detalle.reduce((a, d) => a + d.palabras, 0);
    const nSil = detalle.reduce((a, d) => a + d.silabas, 0);
    const nFra = detalle.length;
    const ifsz = indice(nSil, nPal, nFra);
    return {
      palabras: nPal, silabas: nSil, frases: nFra,
      silPorPal: nPal ? nSil / nPal : 0,
      palPorFrase: nFra ? nPal / nFra : 0,
      ifsz: ifsz == null ? null : Math.round(ifsz * 100) / 100,
      tramo: tramo(ifsz),
      supera: ifsz != null && ifsz > UMBRAL,
      detalle,
      corto: nPal > 0 && nPal < 100
    };
  }

  // ---------- Diagnóstico ----------
  // Palabras técnicas frecuentes en textos sanitarios y una alternativa clara
  const TECNICISMOS = [
    ["deambulación", "caminar"], ["deambular", "caminar"], ["ingesta", "lo que come o bebe"], ["hídrica", "de agua o líquidos"],
    ["disnea", "falta de aire"], ["cefalea", "dolor de cabeza"], ["emesis", "vómitos"], ["pirexia", "fiebre"],
    ["hipertermia", "fiebre"], ["prurito", "picor"], ["edema", "hinchazón"], ["exudado", "líquido que sale de la herida"],
    ["hemorragia", "sangrado"], ["sutura", "puntos"], ["apósito", "venda o gasa"], ["analgesia", "medicamento para el dolor"],
    ["analgésico", "medicamento para el dolor"], ["posología", "cómo y cuándo tomarlo"], ["vía oral", "por la boca"],
    ["ayunas", "sin comer ni beber"], ["domiciliaria", "en casa"], ["domicilio", "casa"], ["focalidad", "signos de alarma (explícalos)"],
    ["sintomatología", "síntomas"], ["patología", "enfermedad"], ["profilaxis", "prevención"], ["contraindicado", "no se debe"],
    ["administrar", "dar o tomar"], ["procederá", "se hará"], ["proceder", "hacer"], ["acudir", "venir o ir"],
    ["valoración", "revisión"], ["intervención", "operación"], ["postoperatorio", "después de la operación"],
    ["evacuante", "laxante"], ["deposición", "hacer de vientre"], ["micción", "orinar"], ["astenia", "cansancio"],
    ["mialgia", "dolor muscular"], ["artralgia", "dolor de articulaciones"], ["hipotensión", "tensión baja"],
    ["hipertensión", "tensión alta"], ["taquicardia", "pulso rápido"], ["glucemia", "azúcar en sangre"],
    ["exploración", "revisión"], ["reconsultar", "volver a consultar"], ["clínica", "síntomas"]
  ];

  const sinTildes = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function tecnicismos(texto) {
    const t = " " + sinTildes(texto).replace(/[^a-zñ ]/g, " ") + " ";
    const vistos = [];
    for (const [term, alt] of TECNICISMOS) {
      const k = sinTildes(term);
      if (t.includes(" " + k + " ") && !vistos.some(v => v.termino === term)) vistos.push({ termino: term, alternativa: alt });
    }
    return vistos;
  }

  function siglas(texto) {
    const s = String(texto || "").match(/\b[A-ZÁÉÍÓÚÑ]{2,}s?\b/g) || [];
    return [...new Set(s)].filter(x => !/^(II|III|IV|VI|VII|VIII|IX|XI|XII)$/.test(x));
  }

  function diagnostico(texto) {
    const a = analizar(texto);
    const largas = a.detalle.filter(d => d.palabras > FRASE_LARGA).map(d => ({ texto: d.texto, palabras: d.palabras }));
    const pal = palabras(texto).filter(w => !/^\d/.test(w));
    const vistas = new Set();
    const largasP = pal.filter(w => silabas(w) >= PALABRA_LARGA && !vistas.has(w.toLowerCase()) && vistas.add(w.toLowerCase()))
      .map(w => ({ palabra: w, silabas: silabas(w) }));
    const pasivas = (String(texto).match(/(?<![a-záéíóúñ])se (?:procederá|realizará|efectuará|llevará a cabo|administrará|le (?:realizará|administrará|practicará))(?![a-záéíóúñ])/gi) || []);
    return { analisis: a, frasesLargas: largas, palabrasLargas: largasP, tecnicismos: tecnicismos(texto), siglas: siglas(texto), pasivas: [...new Set(pasivas.map(p => p.toLowerCase()))] };
  }

  // «Tu siguiente paso»: lo que más subiría la puntuación
  function siguientePaso(d) {
    const a = d.analisis;
    if (!a.palabras) return { texto: "Pega o escribe el texto que quieres revisar: una hoja informativa, unas recomendaciones al alta o un consentimiento.", tipo: "inicio" };
    if (a.corto) return { texto: "El texto es muy corto (menos de 100 palabras): la puntuación orienta poco. Prueba con el texto completo.", tipo: "corto" };
    if (a.palPorFrase > FRASE_LARGA) return { texto: `Tus frases tienen de media ${fmt(a.palPorFrase, 1)} palabras. Parte las más largas (abajo las tienes marcadas): es lo que más sube la puntuación.`, tipo: "frases" };
    if (a.silPorPal > 2.1) return { texto: `Tus palabras tienen de media ${fmt(a.silPorPal, 2)} sílabas. Cambia los términos técnicos y las palabras largas por otras de todos los días.`, tipo: "palabras" };
    if (d.tecnicismos.length) return { texto: `Hay ${d.tecnicismos.length} término${d.tecnicismos.length > 1 ? "s" : ""} técnico${d.tecnicismos.length > 1 ? "s" : ""} con una alternativa más clara. Revísalos abajo.`, tipo: "tecnicismos" };
    if (d.siglas.length) return { texto: `Aparecen siglas (${d.siglas.slice(0, 4).join(", ")}). Quítalas o explícalas la primera vez.`, tipo: "siglas" };
    if (!a.supera) return { texto: "Estás cerca. Acorta alguna frase más y usa palabras más cortas hasta pasar de 55.", tipo: "cerca" };
    return { texto: "La legibilidad es buena. Último paso: pide a dos o tres pacientes que te expliquen con sus palabras qué tienen que hacer.", tipo: "probar" };
  }

  function fmt(n, d = 1) { return (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace(".", ","); }

  // ---------- Apartados ----------
  // Un apartado empieza en cada título. Si el texto viene de un archivo, los
  // títulos son los que marca el propio archivo (estilos de Word, «#» de MD,
  // letra más grande en PDF). Si no, se reconocen por su forma: línea corta
  // sin punto final seguida de texto que es una pregunta, va en mayúsculas,
  // está numerada («2. Cuidados») o va separada por una línea en blanco.
  const RE_NUMERADO = /^(\d+(\.\d+)*\.?|[IVX]+\.)\s+\S/;
  const unaLinea = s => String(s).replace(/\s+/g, " ").trim();

  function pareceTitulo(linea, tras, sigue) {
    const l = unaLinea(linea);
    if (!l || !sigue || /^[•·\-–—*]/.test(l) || /[.,;:]$/.test(l)) return false;
    const n = palabras(l).length;
    if (n < 1 || n > 12) return false;
    const letras = l.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
    if (letras.length >= 3 && letras === letras.toUpperCase()) return true;
    if (/\?$/.test(l) || RE_NUMERADO.test(l)) return true;
    return tras && /^[¿¡A-ZÁÉÍÓÚÑ0-9]/.test(l);
  }

  function apartados(texto, titulos) {
    const ls = normalizar(texto).split("\n");
    const conocidos = new Set((Array.isArray(titulos) ? titulos : []).map(unaLinea).filter(Boolean));
    const usar = conocidos.size && ls.some(l => conocidos.has(unaLinea(l)));
    const out = [];
    let actual = { titulo: null, parrafos: [] };
    ls.forEach((l, i) => {
      const t = unaLinea(l);
      if (!t) return;
      const tras = i === 0 || !ls[i - 1].trim();
      const sigue = ls.slice(i + 1).some(x => x.trim());
      if (usar ? conocidos.has(t) : pareceTitulo(t, tras, sigue)) {
        if (actual.parrafos.length) out.push(actual);
        actual = { titulo: t, parrafos: [] };
      } else actual.parrafos.push(t);
    });
    if (actual.parrafos.length) out.push(actual);
    if (out.length && !out[0].titulo) out[0].titulo = out.length > 1 ? "Inicio (antes del primer título)" : "Todo el texto";
    return out;
  }

  // Legibilidad de cada apartado y de los párrafos más difíciles
  function analizarApartados(texto, titulos) {
    const aps = apartados(texto, titulos).map(a => ({ titulo: a.titulo, parrafos: a.parrafos, analisis: analizar(a.parrafos.join("\n")) }));
    const dificiles = [];
    let nParrafos = 0;
    for (const a of aps) for (const p of a.parrafos) {
      const an = analizar(p);
      if (an.palabras < PARRAFO_MIN) continue;
      nParrafos++;
      if (!an.supera) dificiles.push({ apartado: a.titulo, texto: p, analisis: an });
    }
    dificiles.sort((x, y) => x.analisis.ifsz - y.analisis.ifsz);
    const conNota = aps.filter(a => a.analisis.ifsz != null);
    const peor = conNota.length > 1 ? conNota.reduce((m, a) => a.analisis.ifsz < m.analisis.ifsz ? a : m) : null;
    return { apartados: aps, conTitulos: aps.length > 1, peor, dificiles: dificiles.slice(0, 5).map(x => Object.assign(x, { consejos: consejosParrafo(x.texto) })), nDificiles: dificiles.length, nParrafos };
  }

  // ---------- Consejos para un párrafo difícil ----------
  // Qué lo hace difícil y cómo arreglarlo. La app no reescribe el texto:
  // solo puede poner la alternativa de un tecnicismo (con «Cambiar»).
  function consejosParrafo(texto) {
    const d = diagnostico(texto), out = [];
    const fl = d.frasesLargas.map(f => f.palabras);
    if (fl.length === 1) out.push({ tipo: "frase", texto: `Tiene una frase de ${fl[0]} palabras. Pártela en dos o tres: una idea por frase.` });
    else if (fl.length) out.push({ tipo: "frase", texto: `Tiene ${fl.length} frases de más de ${FRASE_LARGA} palabras (${fl.slice(0, -1).join(", ")} y ${fl[fl.length - 1]}). Pártelas: una idea por frase.` });
    for (const t of d.tecnicismos) out.push({ tipo: "tecnicismo", termino: t.termino, alternativa: t.alternativa, cambiable: !/[()]/.test(t.alternativa), texto: `«${t.termino}»: prueba con «${t.alternativa}».` });
    if (d.pasivas.length) out.push({ tipo: "impersonal", texto: `${d.pasivas.map(p => "«" + p + "»").join(", ")}: dilo en activo y dirigido al lector («le haremos», «tome», «vuelva»).` });
    if (d.siglas.length) out.push({ tipo: "siglas", texto: `Siglas (${d.siglas.join(", ")}): quítalas o explícalas la primera vez.` });
    const largas = d.palabrasLargas.filter(p => !d.tecnicismos.some(t => sinTildes(t.termino) === sinTildes(p.palabra)));
    if (largas.length) out.push({ tipo: "palabras", texto: `Palabras largas: ${largas.slice(0, 6).map(p => p.palabra).join(", ")}. ¿Hay otras más cortas y de todos los días?` });
    if (!out.length) out.push({ tipo: "general", texto: d.analisis.palPorFrase > 15 ? `Las frases tienen de media ${fmt(d.analisis.palPorFrase, 1)} palabras: acórtalas.` : "Usa palabras más cortas y de todos los días." });
    return out;
  }

  // Cambia un término por su alternativa, sin distinguir tildes ni mayúsculas
  // (y respetando la mayúscula inicial). Devuelve el texto nuevo y cuántas veces.
  const VARIANTES = { a: "aá", e: "eé", i: "ií", o: "oó", u: "uúü" };
  function patronTermino(termino) {
    const cuerpo = [...sinTildes(termino)].map(c => VARIANTES[c] ? `[${VARIANTES[c]}]` : c === " " ? "\\s+" : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("");
    return new RegExp(`(?<![\\p{L}\\p{N}])${cuerpo}(?![\\p{L}\\p{N}])`, "giu");
  }
  function reemplazarTermino(texto, termino, alternativa) {
    let n = 0;
    const t = String(texto || "").replace(patronTermino(termino), m => { n++; return /^\p{Lu}/u.test(m) ? alternativa[0].toUpperCase() + alternativa.slice(1) : alternativa; });
    return { texto: t, n };
  }

  // ---------- Textos guardados ----------
  function nuevoTexto(titulo, texto) {
    const ahora = new Date().toISOString();
    return { id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), titulo: String(titulo || "Sin título").slice(0, 120), texto: String(texto || ""), creado: ahora, modificado: ahora };
  }

  function sanear(datos) {
    const out = { app: "legibilidad", v: 1, ultimaCopia: null, textos: [] };
    if (!datos || typeof datos !== "object") return out;
    if (typeof datos.ultimaCopia === "string") out.ultimaCopia = datos.ultimaCopia;
    const lista = Array.isArray(datos.textos) ? datos.textos : [];
    for (const t of lista) {
      if (!t || typeof t !== "object" || typeof t.texto !== "string") continue;
      out.textos.push({
        id: typeof t.id === "string" ? t.id : nuevoTexto().id,
        titulo: String(t.titulo || "Sin título").slice(0, 120),
        texto: t.texto.slice(0, 200000),
        ...(Array.isArray(t.titulos) ? { titulos: t.titulos.filter(x => typeof x === "string").slice(0, 500) } : {}),
        creado: typeof t.creado === "string" ? t.creado : new Date().toISOString(),
        modificado: typeof t.modificado === "string" ? t.modificado : new Date().toISOString()
      });
    }
    return out;
  }

  function fusionar(actual, entrante) {
    const a = sanear(actual), b = sanear(entrante);
    const ids = new Set(a.textos.map(t => t.id));
    for (const t of b.textos) if (!ids.has(t.id)) a.textos.push(t);
    return a;
  }

  // ---------- Documento (bloques para docx.js y para el informe) ----------
  function documentoInforme(titulo, texto, fecha, titulos) {
    const d = diagnostico(texto), a = d.analisis;
    const b = [];
    b.push({ t: "portada", titulo: "Informe de legibilidad", sub: titulo || "Texto sin título", extra: [`Fecha: ${fecha || new Date().toLocaleDateString("es-ES")}`, "Escala INFLESZ · Índice de Flesch-Szigriszt"] });
    b.push({ t: "h1", texto: "Resultado" });
    b.push({ t: "tabla", cab: ["Medida", "Valor"], anchos: [3, 2], filas: [
      ["Índice de Flesch-Szigriszt", a.ifsz == null ? "—" : fmt(a.ifsz, 1)],
      ["Grado en la escala INFLESZ", a.tramo ? a.tramo.nombre : "—"],
      ["¿Supera 55 (recomendado para textos de salud)?", a.ifsz == null ? "—" : (a.supera ? "Sí" : "No")],
      ["Palabras", String(a.palabras)], ["Frases", String(a.frases)], ["Sílabas", String(a.silabas)],
      ["Sílabas por palabra", fmt(a.silPorPal, 2)], ["Palabras por frase", fmt(a.palPorFrase, 1)]
    ] });
    if (a.corto) b.push({ t: "p", estilo: "nota", texto: "Texto de menos de 100 palabras: la puntuación es solo orientativa." });
    const ap = analizarApartados(texto, titulos);
    if (ap.conTitulos) {
      b.push({ t: "h1", texto: "Por apartados" });
      b.push({ t: "tabla", cab: ["Apartado", "Palabras", "Índice", "Grado"], anchos: [5, 2, 2, 3], filas: ap.apartados.map(x => [x.titulo, String(x.analisis.palabras), x.analisis.ifsz == null ? "—" : fmt(x.analisis.ifsz, 1), x.analisis.tramo ? x.analisis.tramo.nombre : "—"]) });
      if (ap.peor) b.push({ t: "p", texto: `El apartado más difícil es «${ap.peor.titulo}». Los apartados de menos de 100 palabras dan una puntuación solo orientativa.` });
    }
    if (ap.dificiles.length) {
      b.push({ t: "h1", texto: "Párrafos más difíciles" });
      b.push({ t: "lista", items: ap.dificiles.map(x => `${fmt(x.analisis.ifsz, 1)} (${x.analisis.tramo.nombre})${ap.conTitulos ? ` · ${x.apartado}` : ""}: ${x.texto} Qué cambiar: ${x.consejos.map(c => c.texto).join(" ")}`) });
    }
    b.push({ t: "h1", texto: "Qué mejorar" });
    const sp = siguientePaso(d);
    b.push({ t: "p", runs: [{ texto: "Tu siguiente paso. ", negrita: true }, { texto: sp.texto }] });
    if (d.frasesLargas.length) { b.push({ t: "h2", texto: `Frases de más de ${FRASE_LARGA} palabras (${d.frasesLargas.length})` }); b.push({ t: "lista", items: d.frasesLargas.map(f => `${f.texto} (${f.palabras} palabras)`) }); }
    if (d.tecnicismos.length) { b.push({ t: "h2", texto: "Términos técnicos con alternativa" }); b.push({ t: "tabla", cab: ["En lugar de…", "Prueba con…"], filas: d.tecnicismos.map(x => [x.termino, x.alternativa]) }); }
    if (d.siglas.length) { b.push({ t: "h2", texto: "Siglas" }); b.push({ t: "p", texto: d.siglas.join(", ") + ". Quítalas o explícalas la primera vez." }); }
    if (d.palabrasLargas.length) { b.push({ t: "h2", texto: `Palabras de ${PALABRA_LARGA} sílabas o más` }); b.push({ t: "p", texto: d.palabrasLargas.map(x => x.palabra).join(", ") }); }
    if (d.pasivas.length) { b.push({ t: "h2", texto: "Construcciones impersonales" }); b.push({ t: "p", texto: d.pasivas.join(", ") + ". Mejor en activo y dirigido al lector: «le haremos», «tome», «vuelva»." }); }
    b.push({ t: "h1", texto: "Texto analizado" });
    for (const p of String(texto).split(/\n+/).filter(x => x.trim())) b.push({ t: "p", texto: p.trim() });
    b.push({ t: "p", estilo: "nota", texto: "Índice de Flesch-Szigriszt: 206,835 − 62,3 × (sílabas/palabras) − (palabras/frases). Escala INFLESZ: Barrio-Cantalejo IM, et al. An Sist Sanit Navar. 2008;31(2):135-52. Recuento de sílabas aproximado. La legibilidad no sustituye a probar el texto con pacientes." });
    return { titulo: "Informe de legibilidad", bloques: b };
  }

  const API = { VERSION, UMBRAL, FRASE_LARGA, PALABRA_LARGA, PARRAFO_MIN, TRAMOS, silabas, frases, palabras, indice, tramo, analizar, pareceTitulo, apartados, analizarApartados, consejosParrafo, reemplazarTermino, tecnicismos, siglas, diagnostico, siguientePaso, fmt, nuevoTexto, sanear, fusionar, documentoInforme };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.Logica = API;
})(typeof window !== "undefined" ? window : globalThis);
