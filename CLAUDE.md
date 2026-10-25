# Legibilidad · CLAUDE.md

PWA estática (sin build, sin dependencias, sin CDN) que mide la legibilidad de textos para pacientes con el índice de Flesch-Szigriszt y la escala INFLESZ. Acompaña al cap. 24 de la Guía (`Guía Calidad y Seguridad/Manuscrito/24-escribir-claro.md`). Responder siempre en español y en lenguaje claro; el autor no es programador. No publicar sin permiso expreso.

## Archivos

- `index.html` — esqueleto, cabecera, navegación, modales (bienvenida, Acerca de con fuentes, confirmar), `#informe` (solo para imprimir).
- `logic.js` — funciones puras (`window.Logica` / `module.exports`): `silabas` (reglas del castellano: diptongos, triptongos, hiatos con tilde, «ii»/«uu», u muda en que/qui/gue/gui, «y» final), `frases` (punto, ?, !, …, ; o salto de línea; respeta abreviaturas como «Dr.»), `palabras`, `indice` (206,835 − 62,3 × síl/pal − pal/frase), `tramo`, `analizar`, `diagnostico` (frases > 20 palabras, `TECNICISMOS` con alternativa, siglas, palabras de ≥ 5 sílabas, impersonales), `siguientePaso`, `sanear`, `fusionar`, `documentoInforme` (bloques para `docx.js` y para el informe impreso).
- `contenido.js` — solo datos: `FACIL`, `TEMAS` (5), `TEST` (6), `EJERCICIOS`, `GLOSARIO` (10), `EJEMPLOS` (hoja de alta del TCE leve, antes y después; caso docente ficticio de la Guía), `NOVEDADES`.
- `app.js` — vistas por ruta: `#/` (Analizar), `#/textos`, `#/comparar`, `#/aprende[/n]`, `#/prueba`, `#/glosario`; informe PDF (`window.print` del `#informe`) y Word (`Docx.construirDocx`).
- `styles.css` (común, copiado de Tamaño Muestral, acento `#0369a1` / oscuro `#38bdf8`) y `legibilidad.css` (propio).
- `docx.js` y `xlsx.js` copiados de Auditorías (docx usa `Xlsx.zipStore`).
- `sw.js` — network-first; solo borra cachés con prefijo `legibilidad-`. Subir `CACHE_NAME` en cada versión.

## Datos

`localStorage["legibilidad-datos"] = { app: "legibilidad", v: 1, ultimaCopia, textos: [{ id, titulo, texto, creado, modificado }] }`; borrador en `legibilidad-borrador`; tema en `legibilidad-tema`. No intercambia datos con otras apps.

## Fuentes

- Fórmula: Wu LL, et al. Transl Vis Sci Technol. 2026;15(2):14 (PMC12898934), comprobada el 2026-10-25.
- Escala y umbral de 55: Barrio-Cantalejo IM, et al. An Sist Sanit Navar. 2008;31(2):135-52 (resumen en PubMed).
- Ley 41/2002, arts. 4.2, 8.2 y 10.1 (BOE consolidado).
- Limitación: el recuento de sílabas es aproximado y puede diferir algún punto del programa INFLESZ original. Pendiente: contrastar con algún texto de referencia puntuado por el programa original.

## Versiones

- **v2026.01 (2026-10-25)**: primera versión, en local, 82 pruebas. Pendiente: publicar (con permiso) en `cjgaland/legibilidad` · https://cjgaland.github.io/legibilidad/, enlazarla desde el portal y las hermanas.
