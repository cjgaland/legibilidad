// Pruebas de la lógica de Legibilidad INFLESZ. Uso: node tests/logic.test.js
const L = require("../logic.js");
let ok = 0, mal = 0;
function prueba(nombre, cond, info) {
  if (cond) ok++; else { mal++; console.log("✗", nombre, info === undefined ? "" : JSON.stringify(info)); }
}

// ---- Sílabas (diptongos, triptongos, hiatos, u muda, y final) ----
const SIL = {
  casa: 2, paciente: 3, hospital: 3, urgencias: 3, médico: 3, enfermería: 5, día: 2, días: 2, país: 2,
  río: 2, ciudad: 2, cuidado: 3, huevo: 2, agua: 2, buey: 1, hoy: 1, muy: 1, rey: 1, y: 1,
  queso: 2, guitarra: 3, pingüino: 3, vergüenza: 3, aeropuerto: 5, leer: 2, poeta: 3, caer: 2,
  tomar: 2, vómitos: 3, ibuprofeno: 5, deambulación: 5, información: 4, comprensible: 4,
  sintomatología: 7, antiinflamatorio: 7, ahumado: 4, prohibir: 3, cefalea: 4, vuelva: 2, oído: 3,
  estudiáis: 3, Paraguay: 3, fluir: 1, construir: 2, ley: 1, "112": 0
};
for (const [w, n] of Object.entries(SIL)) {
  if (w === "112") continue;
  prueba(`sílabas(${w}) = ${n}`, L.silabas(w) === n, L.silabas(w));
}

// ---- Fórmula ----
prueba("índice: 100 palabras, 200 sílabas, 10 frases", Math.abs(L.indice(200, 100, 10) - (206.835 - 124.6 - 10)) < 1e-9);
prueba("índice sin palabras es null", L.indice(0, 0, 0) === null);

// ---- Tramos ----
const T = [[30, "Muy difícil"], [39.99, "Muy difícil"], [40, "Algo difícil"], [54.9, "Algo difícil"], [55, "Normal"], [64.9, "Normal"], [65, "Bastante fácil"], [79.9, "Bastante fácil"], [80, "Muy fácil"], [95, "Muy fácil"]];
for (const [v, n] of T) prueba(`tramo(${v}) = ${n}`, L.tramo(v).nombre === n, L.tramo(v).nombre);
prueba("tramo(null) = null", L.tramo(null) === null);

// ---- Frases ----
prueba("frases con punto", L.frases("Tome agua. Vuelva mañana. ¿Tiene dudas?").length === 3);
prueba("frases de una lista sin punto", L.frases("Vigile:\n• Vómitos\n• Fiebre\n• Dolor de cabeza").length === 4);
prueba("abreviatura Dr. no corta la frase", L.frases("Le verá el Dr. López mañana por la tarde.").length === 1);
prueba("líneas vacías no son frases", L.frases("Hola.\n\n\n").length === 1);

// ---- Palabras ----
prueba("palabras con números", L.palabras("Tome 1 pastilla cada 8 horas").length === 6);

// ---- Análisis completo ----
const tecnico = "Tras la valoración clínica y la exploración neurológica, que no evidencian signos de focalidad, se procede al alta con observación domiciliaria durante las próximas veinticuatro horas, debiendo reconsultar ante la aparición de sintomatología de alarma.";
const claro = "¿Qué tiene que vigilar en casa?\nVómitos.\nDolor de cabeza que va a más.\nMucho sueño.\nSi pasa algo de esto, vuelva a Urgencias.";
const a1 = L.analizar(tecnico), a2 = L.analizar(claro);
prueba("texto técnico: muy difícil", a1.tramo.id === "muy-dificil", a1.ifsz);
prueba("texto claro: fácil", a2.ifsz > 65, a2.ifsz);
prueba("texto claro supera 55", a2.supera === true);
prueba("aviso de texto corto", a2.corto === true);
prueba("análisis vacío", L.analizar("").ifsz === null && L.analizar("").tramo === null);

// ---- Diagnóstico ----
const d1 = L.diagnostico(tecnico);
prueba("detecta frase larga", d1.frasesLargas.length === 1);
prueba("detecta tecnicismos", ["valoración", "exploración", "domiciliaria", "sintomatología", "focalidad", "reconsultar", "clínica"].every(t => d1.tecnicismos.some(x => x.termino === t)), d1.tecnicismos.map(x => x.termino));
prueba("no confunde «clínica» dentro de otra palabra", L.tecnicismos("policlínica").length === 0);
prueba("detecta siglas", L.siglas("Tome AINE si dolor y vaya al PAC.").join() === "AINE,PAC");
prueba("no toma números romanos como siglas", L.siglas("Capítulo IV y VII").length === 0);
prueba("detecta construcciones impersonales", L.diagnostico("Mañana se procederá a la retirada de los puntos.").pasivas.length === 1);

// ---- Siguiente paso ----
prueba("paso inicio", L.siguientePaso(L.diagnostico("")).tipo === "inicio");
prueba("paso frases largas", L.siguientePaso(L.diagnostico((tecnico + " ").repeat(4))).tipo === "frases");
const bueno = ("Tome la pastilla por la mañana. Beba agua. Si le duele, llame al centro de salud. Camine un poco cada día. ").repeat(6);
prueba("paso probar con pacientes", L.siguientePaso(L.diagnostico(bueno)).tipo === "probar", L.analizar(bueno).ifsz);

// ---- Datos ----
const s = L.sanear({ textos: [{ titulo: "A", texto: "Hola" }, { titulo: "malo" }, null], ultimaCopia: 3 });
prueba("sanear descarta textos inválidos", s.textos.length === 1 && s.ultimaCopia === null);
prueba("sanear acepta basura", L.sanear("x").textos.length === 0);
const f = L.fusionar({ textos: [{ id: "a", texto: "1" }] }, { textos: [{ id: "a", texto: "1" }, { id: "b", texto: "2" }] });
prueba("fusionar no duplica", f.textos.length === 2);

// ---- Documento ----
const doc = L.documentoInforme("Hoja de alta", tecnico, "25/10/2026");
prueba("documento con bloques", doc.bloques.length > 5 && doc.bloques[0].t === "portada");
const Docx = require("../docx.js");
const bytes = Docx.construirDocx(Object.assign({ pie: "Legibilidad" }, doc));
prueba("genera un .docx (ZIP)", bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b);

console.log(`\n${ok} correctas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
