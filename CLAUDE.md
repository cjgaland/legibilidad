# Legibilidad · CLAUDE.md

PWA estática (sin build, sin dependencias, sin CDN) que mide la legibilidad de textos para pacientes con el índice de Flesch-Szigriszt y la escala INFLESZ. Acompaña al cap. 24 de la Guía (`Guía Calidad y Seguridad/Manuscrito/24-escribir-claro.md`). Responder siempre en español y en lenguaje claro; el autor no es programador. No publicar sin permiso expreso.

## Archivos

- `index.html` — esqueleto, cabecera, navegación, modales (bienvenida, Acerca de con fuentes, confirmar), `#informe` (solo para imprimir).
- `logic.js` — funciones puras (`window.Logica` / `module.exports`): `silabas` (reglas del castellano: diptongos, triptongos, hiatos con tilde, «ii»/«uu», u muda en que/qui/gue/gui, «y» final), `frases` (punto, ?, !, …, ; o salto de línea; respeta abreviaturas como «Dr.»), `palabras`, `indice` (206,835 − 62,3 × síl/pal − pal/frase), `tramo`, `analizar`, `diagnostico` (frases > 20 palabras, `TECNICISMOS` con alternativa, siglas, palabras de ≥ 5 sílabas, impersonales), `siguientePaso`, `sanear`, `fusionar`, `documentoInforme` (bloques para `docx.js` y para el informe impreso).
  También `pareceTitulo`, `apartados(texto, titulos)` y `analizarApartados` (legibilidad por apartado, el peor, y hasta 5 párrafos de ≥ 15 palabras que no llegan a 55, cada uno con `consejosParrafo`: frases largas, tecnicismos con alternativa, impersonales, siglas, palabras largas). `reemplazarTermino` pone la alternativa de un tecnicismo (sin distinguir tildes ni mayúsculas); en la app, botón «Cambiar» con «Deshacer», salvo alternativas con paréntesis. La app no reescribe el texto. Si `titulos` (los que marca el archivo) no aparece en el texto, los títulos se reconocen por su forma: línea corta sin punto final seguida de texto que es pregunta, va en mayúsculas, está numerada o va tras una línea en blanco.
- `lector.js` — leer informes (`window.Lector` / `module.exports`), todo en el navegador: `deTexto` (TXT, une líneas partidas a mano; UTF-8 o Windows-1252), `deMarkdown` (quita marcas; `#` y subrayados = títulos), `deDocx` (ZIP propio con `DecompressionStream("deflate-raw")`, `word/document.xml` + `word/styles.xml`; títulos por estilo Heading/Título/Title o `outlineLvl`; ignora texto borrado con control de cambios), `dePdf` (líneas de pdf.js → párrafos; títulos por letra ≥ 1,15× la del cuerpo; quita cabeceras/pies repetidos y números de página; `escaneado` si < 30 letras por página), `leerArchivo` (límite 15 MB y 200.000 caracteres). Devuelven `{ texto, titulos }`: un párrafo por línea.
- `vendor/pdfjs-6.4.299/` — pdf.js de Mozilla (build «legacy» de `pdfjs-dist@6.4.299`, Apache 2.0, `LICENSE` y `LEEME.md`), cargado con `import()` solo al abrir un PDF.
- `contenido.js` — solo datos: `FACIL`, `TEMAS` (5), `TEST` (6), `EJERCICIOS`, `GLOSARIO` (10), `EJEMPLOS` (hoja de alta del TCE leve, antes y después; caso docente ficticio de la Guía), `NOVEDADES`.
- `app.js` — vistas por ruta: `#/` (Analizar), `#/textos`, `#/comparar`, `#/aprende[/n]`, `#/prueba`, `#/glosario`; informe PDF (`window.print` del `#informe`) y Word (`Docx.construirDocx`).
- `styles.css` (común, copiado de Tamaño Muestral, acento `#0369a1` / oscuro `#38bdf8`) y `legibilidad.css` (propio).
- `docx.js` y `xlsx.js` copiados de Auditorías (docx usa `Xlsx.zipStore`).
- `sw.js` — network-first; precachea también pdf.js; solo borra cachés con prefijo `legibilidad-`. Subir `CACHE_NAME` en cada versión.
- `tests/` — `logic.test.js`, `lector.test.js` (usa pdf.js en Node; avisa de que falta `@napi-rs/canvas`, es normal) y `ejemplos/` (inventados; `generar.py` los crea).

## Datos

`localStorage["legibilidad-datos"] = { app: "legibilidad", v: 1, ultimaCopia, textos: [{ id, titulo, texto, creado, modificado, titulos? }] }`; borrador en `legibilidad-borrador` (`{ id, titulo, texto, titulos? }`; el texto de un informe subido se queda ahí hasta pulsar «Nuevo»); tema en `legibilidad-tema`. No intercambia datos con otras apps.

## Fuentes

- Fórmula: Wu LL, et al. Transl Vis Sci Technol. 2026;15(2):14 (PMC12898934), comprobada el 2026-10-25.
- Escala y umbral de 55: Barrio-Cantalejo IM, et al. An Sist Sanit Navar. 2008;31(2):135-52 (resumen en PubMed).
- Ley 41/2002, arts. 4.2, 8.2 y 10.1 (BOE consolidado).
- Limitación: el recuento de sílabas es aproximado y puede diferir algún punto del programa INFLESZ original. Pendiente: contrastar con algún texto de referencia puntuado por el programa original.

## Versiones

- **v2026.01 (2026-10-25)**: primera versión, 82 pruebas. **Publicada** el 2026-10-25 en `cjgaland/legibilidad` · https://cjgaland.github.io/legibilidad/ (GitHub Pages, rama `main`). Publicar = commit + `git push`. Pendiente: enlazarla desde el portal y las hermanas.
- **v2026.02 (2026-10-25)**: subir informe (PDF, DOCX, TXT, MD; arrastrar y soltar; solo en el navegador), veredicto por apartados y párrafos más difíciles (también en los informes PDF/Word), «Qué cambiar» en cada párrafo difícil y botón «Cambiar» para tecnicismos, pdf.js 6.4.299 local. 82 + 83 pruebas. **Publicada** el 2026-10-25.
