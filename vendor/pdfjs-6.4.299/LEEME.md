# pdf.js 6.4.299 (Mozilla)

Copia local, sin CDN, para que Legibilidad lea PDF sin conexión.

- Origen: paquete npm `pdfjs-dist@6.4.299` (publicado el 2026-10-03), carpeta `legacy/build/` (la versión «legacy» funciona en más navegadores, incluidos móviles algo antiguos).
- Archivos: `pdf.min.mjs` y `pdf.worker.min.mjs`, sin modificar.
- Licencia: Apache 2.0 (`LICENSE`), © Mozilla Foundation.
- Solo se usa para **extraer el texto** del PDF dentro del navegador. El archivo no se envía a ningún sitio.
- Para actualizar: descargar otra versión estable, copiar los dos archivos en una carpeta nueva `vendor/pdfjs-<versión>/`, cambiar la ruta en `lector.js` y en `sw.js`, y subir `CACHE_NAME`.
