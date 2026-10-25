# Legibilidad · Textos claros para pacientes

Aplicación web (PWA) estática, sin dependencias y utilizable sin conexión, para medir la legibilidad de los textos dirigidos a pacientes (hojas informativas, recomendaciones al alta, consentimientos) y mejorarlos.

- **Índice de Flesch-Szigriszt** y grado en la **escala INFLESZ** (más de 55, recomendado en textos de salud), con escala visual.
- **Tu siguiente paso** y diagnóstico: frases de más de 20 palabras, términos técnicos con alternativa, siglas, palabras largas y construcciones impersonales.
- **Subir informe** en PDF, Word (.docx), TXT o MD, con botón o arrastrando el archivo. Se lee **solo en el navegador**: nunca se envía a ningún sitio. Los PDF escaneados (sin texto) no se pueden leer.
- **Veredicto por apartados**: legibilidad de cada título o apartado y los párrafos más difíciles, para saber dónde retocar, con qué cambiar en cada uno (y botón «Cambiar» para poner la alternativa de un tecnicismo).
- **Mis textos** (guardados solo en el dispositivo, con copia `.json`) y **Comparar** el antes y el después.
- Informe en **PDF** y **Word**. «Explicado fácil», Aprende, Ponte a prueba, glosario y el ejemplo de la hoja de alta del traumatismo craneal leve.

Acompaña al capítulo 24, «Escribir claro para pacientes», de la *Guía de Calidad y Seguridad del Paciente*.

Pruebas: `node tests/logic.test.js` y `node tests/lector.test.js` (archivos de ejemplo inventados en `tests/ejemplos/`, que se regeneran con `python3 tests/ejemplos/generar.py`).

Incluye [pdf.js](https://mozilla.github.io/pdf.js/) 6.4.299 de Mozilla (licencia Apache 2.0) en `vendor/`, sin CDN, para leer PDF sin conexión.

**Autores**: Carlos J. Galán Doval (Médico de Familia · Técnico en Calidad y Seguridad del Paciente) y Rafael J. Romero de Castilla Gil (Médico de Familia · Responsable del Área de Calidad y Seguridad del Paciente), Área de Gestión Sanitaria Sur de Córdoba · Andalucía. De libre uso con fines docentes y divulgativos. No sustituye el criterio profesional.
