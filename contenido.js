// ============================================================
//  contenido.js — Legibilidad INFLESZ · solo datos (textos didácticos)
//  Acompaña al capítulo 24 de la Guía de Calidad y Seguridad del Paciente.
// ============================================================
(function (raiz) {
  "use strict";

  const FACIL = `
<h3>¿Qué mide esta app?</h3>
<p>Lo fácil o difícil que es <b>leer</b> un texto en castellano. Cuenta las palabras, las frases y las sílabas, y calcula el <b>índice de Flesch-Szigriszt</b>: cuanto más alto, más fácil. Después lo sitúa en la <b>escala INFLESZ</b>, pensada para los textos dirigidos a pacientes.</p>
<h3>¿Qué hace bajar la puntuación?</h3>
<ul><li><b>Frases largas</b>: muchas palabras antes del punto.</li><li><b>Palabras largas</b>: muchas sílabas por palabra, como suelen tener los tecnicismos.</li></ul>
<h3>¿Qué puntuación buscar?</h3>
<p>En los textos de salud, <b>más de 55</b>. Por debajo de 40, el texto es «muy difícil», como un artículo científico.</p>
<div class="box box--trampa"><span class="box-tag">Ojo</span><p>La fórmula cuenta, no entiende. No sabe si falta lo importante, si el orden es lógico o si el tono asusta. Úsala como termómetro y, al final, pide a dos o tres pacientes que te expliquen con sus palabras qué tienen que hacer.</p></div>`;

  const TEMAS = [
    { id: "por-que", titulo: "Por qué escribir claro es seguridad del paciente", html: `
<p>Un paciente que no entiende las instrucciones del alta, la preparación de una prueba o los signos de alarma corre riesgos que ningún protocolo evita. Escribir claro es una práctica de seguridad.</p>
<p>Además, la Ley 41/2002 de autonomía del paciente pide que la información clínica se comunique «de forma comprensible y adecuada a sus necesidades» (artículo 4.2).</p>
<div class="box box--idea"><span class="box-tag">Idea clave</span><p>Si el paciente no lo entiende, no lo hemos explicado.</p></div>` },
    { id: "escala", titulo: "La escala INFLESZ", html: `
<p>La escala INFLESZ se validó en España para evaluar la legibilidad de los textos para pacientes. Parte del índice de Flesch-Szigriszt, una adaptación al castellano de la fórmula de Flesch:</p>
<p class="formula"><b>IFSZ = 206,835 − 62,3 × (sílabas ÷ palabras) − (palabras ÷ frases)</b></p>
<table class="tabla-leg"><thead><tr><th>Puntuación</th><th>Grado</th></tr></thead><tbody>
<tr><td>Menos de 40</td><td>Muy difícil</td></tr><tr><td>40 a 55</td><td>Algo difícil</td></tr><tr><td>55 a 65</td><td>Normal</td></tr><tr><td>65 a 80</td><td>Bastante fácil</td></tr><tr><td>Más de 80</td><td>Muy fácil</td></tr></tbody></table>
<p>Según sus autores, los textos sobre salud tienen más probabilidad de ser leídos y entendidos si superan los <b>55 puntos</b>. En su estudio, las revistas científicas se quedaron de media por debajo de 40.</p>` },
    { id: "como", titulo: "Seis claves para escribir claro", html: `
<ol><li><b>Decide para quién y para qué</b>: ¿quién lo lee y qué tiene que hacer después?</li>
<li><b>Lo importante, primero</b>, con títulos en forma de pregunta: «¿Qué tengo que hacer en casa?».</li>
<li><b>Palabras de todos los días</b>: «falta de aire» mejor que «disnea».</li>
<li><b>Frases cortas</b>, de unas 15 a 20 palabras como mucho, y verbos dirigidos al lector: «tome», «vuelva», «llame».</li>
<li><b>Un formato que se recorra con la vista</b>: listas, letra grande, espacio en blanco y el teléfono de contacto al final.</li>
<li><b>Mide y prueba</b>: la puntuación orienta; los pacientes confirman.</li></ol>` },
    { id: "consentimiento", titulo: "El consentimiento informado", html: `
<p>La Ley 41/2002 pide el consentimiento por escrito en las intervenciones quirúrgicas, en los procedimientos diagnósticos y terapéuticos invasores y, en general, cuando hay riesgos de notoria y previsible repercusión negativa (artículo 8.2).</p>
<p>Antes de firmarlo, el paciente debe recibir la información básica (artículo 10.1): las consecuencias relevantes de la intervención, los riesgos relacionados con sus circunstancias personales o profesionales, los riesgos probables y las contraindicaciones.</p>
<div class="box box--practica"><span class="box-tag">En la práctica</span><p>Ordena el consentimiento con preguntas: «¿Qué me van a hacer?», «¿Qué riesgos tiene?», «¿Hay otras opciones?», «¿Qué pasa si no me lo hago?». Y mide su legibilidad con esta app.</p></div>` },
    { id: "probar", titulo: "Probar el texto con pacientes", html: `
<p>Da el texto a dos o tres pacientes, familiares o personas ajenas a la sanidad, y pídeles que te cuenten con sus palabras qué tienen que hacer. Lo que no sepan explicar es lo que hay que reescribir.</p>
<p>En la consulta funciona igual: «Para asegurarme de que me he explicado bien, ¿me cuenta qué va a hacer en casa?».</p>` }
  ];

  const TEST = [
    { q: "¿Qué puntuación conviene superar en un texto para pacientes?", o: ["30", "40", "55", "90"], ok: 2, fb: "Por encima de 55, los textos de salud tienen más probabilidad de ser leídos y entendidos." },
    { q: "Un texto obtiene 72. ¿Cómo se califica en la escala INFLESZ?", o: ["Muy difícil", "Normal", "Bastante fácil", "Muy fácil"], ok: 2, fb: "De 65 a 80 es «bastante fácil»." },
    { q: "¿Qué dos cosas bajan la puntuación?", o: ["Las tildes y las comas", "Las frases largas y las palabras con muchas sílabas", "Los títulos y las listas", "Los números"], ok: 1, fb: "La fórmula castiga las palabras por frase y las sílabas por palabra." },
    { q: "Tu hoja de alta saca 48. ¿Qué cambio subirá más la puntuación?", o: ["Pasarla a mayúsculas", "Partir las frases largas y cambiar tecnicismos por palabras comunes", "Añadir más información", "Ponerla en otra letra"], ok: 1, fb: "Frases más cortas y palabras más cortas: son las dos variables de la fórmula." },
    { q: "¿Basta con superar 55 para saber que la hoja se entiende?", o: ["Sí, la fórmula lo garantiza", "No: hay que probarla con pacientes", "Sí, si además tiene dibujos", "No, hay que llegar a 100"], ok: 1, fb: "La fórmula cuenta, no entiende. Los pacientes confirman." },
    { q: "Según la Ley 41/2002, ¿cómo debe comunicarse la información clínica?", o: ["Por escrito siempre", "De forma comprensible y adecuada a las necesidades del paciente", "Con lenguaje técnico para no equivocarse", "Solo a la familia"], ok: 1, fb: "Es lo que dice el artículo 4.2." }
  ];

  const EJERCICIOS = [
    { titulo: "Reescribe esta frase", texto: "Ante la aparición de disnea o dolor torácico, deberá acudir de forma inmediata al servicio de urgencias de su hospital de referencia.", pista: "Una propuesta: «Si le falta el aire o le duele el pecho, vaya a Urgencias enseguida». Pega las dos versiones y compara." },
    { titulo: "Quita las siglas", texto: "Tome AINE si dolor y acuda al PAC si fiebre > 38 ºC.", pista: "«Si le duele, tome ibuprofeno. Si tiene fiebre de más de 38 grados, vaya al punto de urgencias de su centro de salud»." }
  ];

  const GLOSARIO = [
    ["Legibilidad", "Facilidad con la que se lee un texto, según la longitud de sus palabras y de sus frases. No es lo mismo que comprensión, pero ayuda a ella."],
    ["Índice de Flesch-Szigriszt", "Adaptación al castellano de la fórmula de Flesch: 206,835 − 62,3 × (sílabas ÷ palabras) − (palabras ÷ frases). Cuanto más alto, más fácil."],
    ["Escala INFLESZ", "Escala que clasifica el índice de Flesch-Szigriszt en cinco grados, de «muy difícil» a «muy fácil», pensada para textos de salud."],
    ["Sílabas por palabra", "Media de sílabas de las palabras del texto. Los tecnicismos la suben."],
    ["Palabras por frase", "Media de palabras entre punto y punto. Es lo que más baja la puntuación cuando las frases son largas."],
    ["Alfabetización en salud", "Capacidad de una persona para encontrar, entender y usar la información sobre su salud."],
    ["Consentimiento informado", "Conformidad libre y consciente del paciente, después de recibir la información adecuada, para que se le haga una actuación sanitaria (Ley 41/2002)."],
    ["Tecnicismo", "Palabra propia de una profesión que el paciente puede no conocer: «disnea», «deambulación», «posología»."],
    ["Lenguaje claro", "Forma de escribir que permite a quien lee encontrar lo que necesita, entenderlo y usarlo a la primera."],
    ["Prueba con pacientes", "Pedir a algunos pacientes que expliquen con sus palabras lo que han leído, para comprobar que se entiende."]
  ];

  // Ejemplo completo: la hoja de alta del traumatismo craneal leve (caso docente ficticio de la Guía, cap. 24)
  const EJEMPLOS = [
    { id: "ej-tce-antes", titulo: "Ejemplo · Hoja de alta del traumatismo craneal leve (antes)", texto:
"Recomendaciones al alta tras traumatismo craneoencefálico leve.\nTras la valoración clínica y la exploración neurológica, que no evidencian signos de focalidad, se procede al alta con observación domiciliaria durante las próximas veinticuatro horas, debiendo permanecer acompañado por un adulto responsable que pueda supervisar la evolución del paciente. Ante la aparición de sintomatología de alarma, consistente en vómitos de repetición, cefalea progresiva, somnolencia, desorientación o alteración de la fuerza o de la sensibilidad en las extremidades, deberá reconsultar de forma inmediata en el servicio de urgencias. Se recomienda evitar la ingesta de bebidas alcohólicas y la administración de fármacos sedantes, así como la realización de actividad física intensa durante las próximas cuarenta y ocho horas. Para el control del dolor podrá administrarse paracetamol a dosis habituales según la posología indicada en el informe de alta." },
    { id: "ej-tce-despues", titulo: "Ejemplo · Hoja de alta del traumatismo craneal leve (después)", texto:
"¿Qué tiene que vigilar en casa durante las próximas 24 horas?\nUn adulto debe quedarse con usted todo el día.\nVuelva a Urgencias o llame al 112 si nota alguna de estas cosas:\nVomita más de una vez.\nEl dolor de cabeza va a más.\nTiene mucho sueño y cuesta despertarle.\nEstá confuso o no reconoce a los suyos.\nNota menos fuerza en un brazo o una pierna.\n¿Qué puede hacer para estar mejor?\nSi le duele la cabeza, tome paracetamol, como le hemos escrito en el informe.\nNo beba alcohol en dos días.\nNo tome pastillas para dormir.\nDescanse. No haga deporte en dos días.\n¿Tiene dudas? Llame a su centro de salud." }
  ];

  const NOVEDADES = [
    // [eco]
    { v: "2026.03", fecha: "2026-10-26", items: ["En «Acerca de», enlace a la nueva app hermana Lectura Crítica: lee críticamente un artículo paso a paso con las plantillas de CASPe, calculadoras y un veredicto."] },
    // [/eco]
    { v: "2026.02", fecha: "2026-10-25", items: ["Subir informe: lee PDF, Word (.docx), TXT y MD con el botón o arrastrando el archivo. Se lee solo en tu navegador y no se envía a ningún sitio. Los PDF escaneados no se pueden leer.", "Veredicto por apartados: la legibilidad de cada título o apartado, el más difícil señalado y los párrafos más difíciles, con «Ver en el texto» para retocarlos. También en el informe en PDF y Word.", "Qué cambiar en cada párrafo difícil: frases largas, tecnicismos con su alternativa, impersonales, siglas y palabras largas. Botón «Cambiar» para poner la alternativa de un tecnicismo (en el párrafo o en todo el texto), con «Deshacer».", "Lector de PDF incluido en la app (pdf.js de Mozilla 6.4.299), para que funcione sin conexión."] },
    { v: "2026.01", fecha: "2026-10-25", items: ["Primera versión: índice de Flesch-Szigriszt y escala INFLESZ, diagnóstico (frases largas, tecnicismos, siglas, palabras largas, impersonales), «Tu siguiente paso», comparar versiones, mis textos con copia de seguridad, informe en PDF y Word, Aprende, Ponte a prueba, glosario y el ejemplo de la Guía."] }
  ];

  const API = { FACIL, TEMAS, TEST, EJERCICIOS, GLOSARIO, EJEMPLOS, NOVEDADES };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.Contenido = API;
})(typeof window !== "undefined" ? window : globalThis);
