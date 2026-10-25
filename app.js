// ============================================================
//  app.js — Legibilidad INFLESZ · interfaz (vistas por #ruta)
//  Datos: localStorage["legibilidad-datos"] = { app, v, ultimaCopia, textos: [] }
//  Borrador del texto en curso: localStorage["legibilidad-borrador"]
// ============================================================
(function () {
  "use strict";
  const L = window.Logica, C = window.Contenido;
  const CLAVE = "legibilidad-datos", BORRADOR = "legibilidad-borrador", TEMA = "legibilidad-tema", BIENV = "legibilidad-bienvenida-vista";
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lee = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const escribe = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { toast("No se ha podido guardar en este navegador (¿modo privado?)."); return false; } };

  let datos = L.sanear(JSON.parse(lee(CLAVE) || "null"));
  let borrador = (() => { try { return JSON.parse(lee(BORRADOR) || "null") || { id: null, titulo: "", texto: "" }; } catch (e) { return { id: null, titulo: "", texto: "" }; } })();
  const guardarDatos = () => escribe(CLAVE, JSON.stringify(datos));
  const guardarBorrador = () => escribe(BORRADOR, JSON.stringify(borrador));

  // ---------- Utilidades ----------
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function descargar(blob, nombre) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const nombreArchivo = t => (t || "texto").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "texto";
  const fecha = iso => { try { return new Date(iso).toLocaleDateString("es-ES"); } catch (e) { return ""; } };
  function confirmar(texto) {
    return new Promise(res => {
      $("#conf-texto").textContent = texto; $("#modal-confirmar").hidden = false;
      const fin = v => { $("#modal-confirmar").hidden = true; $("#conf-si").onclick = $("#conf-no").onclick = null; res(v); };
      $("#conf-si").onclick = () => fin(true); $("#conf-no").onclick = () => fin(false);
    });
  }

  // ---------- Piezas de resultado ----------
  function escalaHTML(ifsz) {
    const pos = ifsz == null ? null : Math.max(0, Math.min(100, ifsz));
    return `<div class="escala" aria-hidden="true">
      <div class="escala-barra"><span class="e-rojo" style="width:40%"></span><span class="e-ambar" style="width:15%"></span><span class="e-verde1" style="width:10%"></span><span class="e-verde2" style="width:15%"></span><span class="e-verde3" style="width:20%"></span></div>
      <div class="escala-umbral" style="left:55%"><span>55</span></div>
      ${pos == null ? "" : `<div class="escala-marca" style="left:${pos}%"></div>`}
      <div class="escala-etq">${[0, 40, 65, 80, 100].map(x => `<span style="left:${x}%">${x}</span>`).join("")}</div>
    </div>`;
  }

  function resultadoHTML(a) {
    if (a.ifsz == null) return `<div class="result-card leg-res leg-res--vacio"><div class="res-label">Índice de Flesch-Szigriszt</div><div class="res-big">—</div><div class="res-sub">Escribe o pega un texto para ver su legibilidad</div>${escalaHTML(null)}</div>`;
    const t = a.tramo;
    return `<div class="result-card leg-res leg-res--${t.color}">
      <div class="res-label">Índice de Flesch-Szigriszt</div>
      <div class="res-big">${L.fmt(a.ifsz, 1)}</div>
      <div class="leg-grado">${esc(t.nombre)}</div>
      <div class="res-sub">${a.supera ? "Supera 55: adecuado para un texto de salud" : "No llega a 55: conviene simplificar"}</div>
      ${escalaHTML(a.ifsz)}
      <div class="leg-cifras">
        <div><b>${a.palabras}</b><span>palabras</span></div><div><b>${a.frases}</b><span>frases</span></div><div><b>${a.silabas}</b><span>sílabas</span></div>
        <div><b>${L.fmt(a.palPorFrase, 1)}</b><span>palabras por frase</span></div><div><b>${L.fmt(a.silPorPal, 2)}</b><span>sílabas por palabra</span></div>
      </div>
      ${a.corto ? `<p class="warn">Texto de menos de 100 palabras: la puntuación es solo orientativa.</p>` : ""}
    </div>`;
  }

  function diagnosticoHTML(d) {
    const sp = L.siguientePaso(d);
    let h = `<div class="leg-paso"><span class="box-tag">Tu siguiente paso</span><p>${esc(sp.texto)}</p></div>`;
    if (!d.analisis.palabras) return h;
    const sec = (titulo, cuerpo, n) => `<details class="card leg-diag" ${n ? "open" : ""}><summary><b>${titulo}</b> <span class="chip ${n ? "chip--accent" : ""}">${n}</span></summary><div class="leg-diag-body">${cuerpo}</div></details>`;
    h += sec(`Frases de más de ${L.FRASE_LARGA} palabras`, d.frasesLargas.length ? `<ol class="leg-lista">${d.frasesLargas.map(f => `<li><mark>${esc(f.texto)}</mark> <span class="leg-n">${f.palabras} palabras</span></li>`).join("")}</ol><p class="note">Pártelas en dos o tres frases. Una idea por frase.</p>` : `<p>Ninguna. Bien.</p>`, d.frasesLargas.length);
    h += sec("Términos técnicos", d.tecnicismos.length ? `<table class="tabla-leg"><thead><tr><th>En lugar de…</th><th>Prueba con…</th></tr></thead><tbody>${d.tecnicismos.map(t => `<tr><td>${esc(t.termino)}</td><td>${esc(t.alternativa)}</td></tr>`).join("")}</tbody></table>` : `<p>No se han encontrado tecnicismos de la lista. Revisa tú los propios de tu especialidad.</p>`, d.tecnicismos.length);
    h += sec("Siglas", d.siglas.length ? `<p>${d.siglas.map(esc).join(", ")}</p><p class="note">Quítalas o explícalas la primera vez que aparezcan.</p>` : `<p>Ninguna.</p>`, d.siglas.length);
    h += sec(`Palabras de ${L.PALABRA_LARGA} sílabas o más`, d.palabrasLargas.length ? `<p>${d.palabrasLargas.map(p => esc(p.palabra)).join(", ")}</p><p class="note">No todas sobran, pero cada una baja la puntuación. ¿Hay otra más corta?</p>` : `<p>Ninguna.</p>`, d.palabrasLargas.length);
    h += sec("Construcciones impersonales", d.pasivas.length ? `<p>${d.pasivas.map(esc).join(", ")}</p><p class="note">Mejor en activo y dirigido al lector: «le haremos», «tome», «vuelva».</p>` : `<p>Ninguna.</p>`, d.pasivas.length);
    return h;
  }

  // ---------- Vistas ----------
  function vistaAnalizar() {
    const v = $("#view");
    v.innerHTML = `
      <h1 class="page-title">Analizar un texto</h1>
      <p class="page-lead">Pega una hoja informativa, unas recomendaciones al alta o un consentimiento. La puntuación se calcula al momento.</p>
      <details class="card leg-facil"><summary><b>Explicado fácil</b></summary><div class="facil-body">${C.FACIL}</div></details>
      <div class="leg-grid">
        <div class="card leg-editor">
          <label class="field-label" for="titulo">Título</label>
          <input id="titulo" class="leg-input" maxlength="120" placeholder="Por ejemplo: Hoja de alta tras traumatismo craneal" value="${esc(borrador.titulo)}" />
          <label class="field-label" for="texto">Texto</label>
          <textarea id="texto" class="leg-texto" placeholder="Pega aquí el texto…" spellcheck="true">${esc(borrador.texto)}</textarea>
          <div class="toolbar">
            <button class="btn btn--primary" id="b-guardar">Guardar en Mis textos</button>
            <button class="btn" id="b-nuevo">Nuevo</button>
            <button class="btn" id="b-ejemplo">Cargar ejemplo</button>
          </div>
          <div class="toolbar">
            <button class="btn" id="b-pdf">Informe en PDF</button>
            <button class="btn" id="b-word">Informe en Word</button>
          </div>
          ${borrador.id ? `<p class="leg-n">Editando un texto guardado. «Guardar» actualiza esa versión; para conservar las dos, pulsa antes «Nuevo» y pega el texto.</p>` : ""}
        </div>
        <div class="leg-panel">
          <div id="resultado"></div>
          <div id="diagnostico"></div>
        </div>
      </div>`;
    const pintar = () => {
      const d = L.diagnostico(borrador.texto);
      $("#resultado").innerHTML = resultadoHTML(d.analisis);
      $("#diagnostico").innerHTML = diagnosticoHTML(d);
    };
    let tmr = null;
    $("#texto").addEventListener("input", e => { borrador.texto = e.target.value; clearTimeout(tmr); tmr = setTimeout(() => { pintar(); guardarBorrador(); }, 250); });
    $("#titulo").addEventListener("input", e => { borrador.titulo = e.target.value; guardarBorrador(); });
    $("#b-guardar").onclick = () => {
      if (!borrador.texto.trim()) return toast("No hay texto que guardar.");
      const ahora = new Date().toISOString();
      const ex = borrador.id && datos.textos.find(t => t.id === borrador.id);
      if (ex) { ex.titulo = borrador.titulo || "Sin título"; ex.texto = borrador.texto; ex.modificado = ahora; }
      else { const t = L.nuevoTexto(borrador.titulo || "Sin título", borrador.texto); datos.textos.unshift(t); borrador.id = t.id; }
      guardarDatos(); guardarBorrador(); toast("Guardado en Mis textos."); vistaAnalizar();
    };
    $("#b-nuevo").onclick = () => { borrador = { id: null, titulo: "", texto: "" }; guardarBorrador(); vistaAnalizar(); $("#texto").focus(); };
    $("#b-ejemplo").onclick = () => { const e = C.EJEMPLOS[0]; borrador = { id: null, titulo: e.titulo, texto: e.texto }; guardarBorrador(); vistaAnalizar(); toast("Ejemplo cargado: compáralo con la versión «después» en Comparar."); };
    $("#b-pdf").onclick = () => informePDF(borrador.titulo, borrador.texto);
    $("#b-word").onclick = () => informeWord(borrador.titulo, borrador.texto);
    pintar();
  }

  function vistaTextos() {
    const v = $("#view");
    const filas = datos.textos.map(t => {
      const a = L.analizar(t.texto);
      return `<div class="card leg-item"><div class="leg-item-cab"><b>${esc(t.titulo)}</b><span class="leg-badge leg-badge--${a.tramo ? a.tramo.color : "gris"}">${a.ifsz == null ? "—" : L.fmt(a.ifsz, 1)} · ${a.tramo ? esc(a.tramo.nombre) : "sin texto"}</span></div>
        <p class="leg-n">${a.palabras} palabras · modificado el ${fecha(t.modificado)}</p>
        <div class="toolbar"><button class="btn" data-abrir="${t.id}">Abrir</button><button class="btn" data-dup="${t.id}">Duplicar</button><button class="btn btn--ghost" data-borrar="${t.id}">Borrar</button></div></div>`;
    }).join("");
    const viejo = datos.textos.length && (!datos.ultimaCopia || (Date.now() - new Date(datos.ultimaCopia)) > 30 * 864e5);
    v.innerHTML = `<h1 class="page-title">Mis textos</h1>
      <p class="page-lead">Las versiones que has guardado, con su puntuación. Se quedan solo en este dispositivo.</p>
      ${viejo ? `<p class="warn">${datos.ultimaCopia ? "Hace más de un mes que no haces una copia de seguridad." : "Aún no has hecho ninguna copia de seguridad."} Si borras los datos del navegador, perderás tus textos.</p>` : ""}
      <div class="toolbar"><button class="btn btn--primary" id="b-copia">Descargar copia (.json)</button><button class="btn" id="b-importar">Importar copia</button></div>
      ${filas || `<div class="card"><p>Todavía no has guardado ningún texto. Analiza uno y pulsa «Guardar en Mis textos».</p></div>`}`;
    v.querySelectorAll("[data-abrir]").forEach(b => b.onclick = () => { const t = datos.textos.find(x => x.id === b.dataset.abrir); borrador = { id: t.id, titulo: t.titulo, texto: t.texto }; guardarBorrador(); location.hash = "#/"; });
    v.querySelectorAll("[data-dup]").forEach(b => b.onclick = () => { const t = datos.textos.find(x => x.id === b.dataset.dup); const n = L.nuevoTexto(t.titulo + " (copia)", t.texto); datos.textos.unshift(n); guardarDatos(); vistaTextos(); });
    v.querySelectorAll("[data-borrar]").forEach(b => b.onclick = async () => {
      const t = datos.textos.find(x => x.id === b.dataset.borrar);
      if (!(await confirmar(`Se borrará «${t.titulo}» de este dispositivo. No se puede deshacer.`))) return;
      datos.textos = datos.textos.filter(x => x.id !== t.id); if (borrador.id === t.id) borrador.id = null; guardarDatos(); guardarBorrador(); vistaTextos();
    });
    $("#b-copia").onclick = () => {
      datos.ultimaCopia = new Date().toISOString(); guardarDatos();
      descargar(new Blob([JSON.stringify({ app: "legibilidad", appVersion: L.VERSION, generado: datos.ultimaCopia, datos }, null, 2)], { type: "application/json" }), `legibilidad-copia-${new Date().toISOString().slice(0, 10)}.json`);
      vistaTextos();
    };
    $("#b-importar").onclick = () => $("#input-importar").click();
  }

  function vistaComparar() {
    const v = $("#view");
    const opciones = [...datos.textos.map(t => ({ id: t.id, titulo: t.titulo, texto: t.texto })), ...C.EJEMPLOS];
    const sel = (id, def) => `<select id="${id}" class="leg-input">${opciones.map((o, i) => `<option value="${esc(o.id)}" ${i === def ? "selected" : ""}>${esc(o.titulo)}</option>`).join("")}</select>`;
    const n = datos.textos.length;
    v.innerHTML = `<h1 class="page-title">Comparar dos versiones</h1>
      <p class="page-lead">El antes y el después de un texto. Elige dos de Mis textos o compara el ejemplo de la Guía.</p>
      <div class="leg-comp">
        <div class="card"><label class="field-label" for="c-a">Antes</label>${sel("c-a", n ? Math.min(1, n - 1) : n)}<div id="r-a"></div></div>
        <div class="card"><label class="field-label" for="c-b">Después</label>${sel("c-b", n ? 0 : n + 1)}<div id="r-b"></div></div>
      </div><div id="c-dif"></div>`;
    const pinta = () => {
      const A = opciones.find(o => o.id === $("#c-a").value), B = opciones.find(o => o.id === $("#c-b").value);
      const a = L.analizar(A.texto), b = L.analizar(B.texto);
      $("#r-a").innerHTML = resultadoHTML(a); $("#r-b").innerHTML = resultadoHTML(b);
      if (a.ifsz != null && b.ifsz != null) {
        const dif = b.ifsz - a.ifsz;
        $("#c-dif").innerHTML = `<div class="leg-paso"><span class="box-tag">Resultado</span><p>${dif >= 0 ? "La nueva versión gana" : "La nueva versión pierde"} <b>${L.fmt(Math.abs(dif), 1)} puntos</b>: de «${esc(a.tramo.nombre)}» a «${esc(b.tramo.nombre)}». Frases de ${L.fmt(a.palPorFrase, 1)} a ${L.fmt(b.palPorFrase, 1)} palabras; palabras de ${L.fmt(a.silPorPal, 2)} a ${L.fmt(b.silPorPal, 2)} sílabas.</p></div>`;
      } else $("#c-dif").innerHTML = "";
    };
    $("#c-a").onchange = $("#c-b").onchange = pinta; pinta();
  }

  function vistaAprende(n) {
    const v = $("#view");
    if (n != null && C.TEMAS[n]) {
      const t = C.TEMAS[n];
      v.innerHTML = `<p><a href="#/aprende">← Aprende</a></p><h1 class="page-title">${esc(t.titulo)}</h1><div class="card facil-body leg-tema">${t.html}</div>
        <div class="toolbar">${n > 0 ? `<a class="btn" href="#/aprende/${n - 1}">← Anterior</a>` : ""}${n < C.TEMAS.length - 1 ? `<a class="btn btn--primary" href="#/aprende/${n + 1}">Siguiente →</a>` : `<a class="btn btn--primary" href="#/prueba">Ponte a prueba →</a>`}</div>`;
      return;
    }
    v.innerHTML = `<h1 class="page-title">Aprende</h1><p class="page-lead">Lo esencial del capítulo 24 de la Guía, en cinco temas breves.</p>
      ${C.TEMAS.map((t, i) => `<a class="card leg-enlace" href="#/aprende/${i}"><span class="leg-num">${i + 1}</span> ${esc(t.titulo)}</a>`).join("")}
      <h2 class="leg-h2">Practica</h2>
      ${C.EJERCICIOS.map((e, i) => `<div class="card"><b>${esc(e.titulo)}</b><p class="leg-cita">${esc(e.texto)}</p><details><summary>Ver una propuesta</summary><p>${esc(e.pista)}</p></details><button class="btn" data-ej="${i}">Analizar esta frase</button></div>`).join("")}`;
    v.querySelectorAll("[data-ej]").forEach(b => b.onclick = () => { const e = C.EJERCICIOS[+b.dataset.ej]; borrador = { id: null, titulo: e.titulo, texto: e.texto }; guardarBorrador(); location.hash = "#/"; });
  }

  function vistaPrueba() {
    const v = $("#view");
    v.innerHTML = `<h1 class="page-title">Ponte a prueba</h1><p class="page-lead">Seis preguntas. Pulsa una respuesta para ver si aciertas y por qué.</p>
      <div class="card">${C.TEST.map((q, i) => `<div class="quiz-q" data-q="${i}"><p><b>${i + 1}.</b> ${esc(q.q)}</p>${q.o.map((o, j) => `<button class="quiz-o" data-o="${j}">${esc(o)}</button>`).join("")}<div class="quiz-fb" hidden></div></div>`).join("")}</div>
      <p id="q-total" class="leg-n"></p>`;
    let aciertos = 0, hechas = 0;
    v.querySelectorAll(".quiz-q").forEach(div => {
      const q = C.TEST[+div.dataset.q];
      div.querySelectorAll(".quiz-o").forEach(b => b.onclick = () => {
        if (div.dataset.hecha) return; div.dataset.hecha = "1"; hechas++;
        const j = +b.dataset.o; if (j === q.ok) aciertos++;
        div.querySelectorAll(".quiz-o").forEach((x, k) => { if (k === q.ok) x.classList.add("quiz-o--ok"); else if (k === j) x.classList.add("quiz-o--mal"); });
        const fb = div.querySelector(".quiz-fb"); fb.hidden = false; fb.textContent = (j === q.ok ? "Correcto. " : "No es esa. ") + q.fb;
        if (hechas === C.TEST.length) $("#q-total").textContent = `Has acertado ${aciertos} de ${C.TEST.length}.`;
      });
    });
  }

  function vistaGlosario() {
    const v = $("#view");
    v.innerHTML = `<h1 class="page-title">Glosario</h1><p class="page-lead">Las palabras de la app, en una línea.</p>
      <div class="card glos-buscar"><input id="g-buscar" placeholder="Buscar…" aria-label="Buscar en el glosario" /></div><dl class="glos-lista" id="g-lista"></dl>`;
    const pinta = f => { const k = f.toLowerCase(); $("#g-lista").innerHTML = C.GLOSARIO.filter(([t, d]) => !k || (t + d).toLowerCase().includes(k)).map(([t, d]) => `<div class="glos-item"><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join(""); };
    $("#g-buscar").oninput = e => pinta(e.target.value); pinta("");
  }

  // ---------- Informes ----------
  function bloquesHTML(doc) {
    return doc.bloques.map(b => {
      if (b.t === "portada") return `<h1>${esc(b.titulo)}</h1><p class="inf-sub">${esc(b.sub)}</p>${(b.extra || []).map(x => `<p class="inf-extra">${esc(x)}</p>`).join("")}`;
      if (b.t === "h1") return `<h2>${esc(b.texto)}</h2>`;
      if (b.t === "h2") return `<h3>${esc(b.texto)}</h3>`;
      if (b.t === "p") return `<p class="${b.estilo === "nota" ? "inf-nota" : ""}">${b.runs ? b.runs.map(r => r.negrita ? `<b>${esc(r.texto)}</b>` : esc(r.texto)).join("") : esc(b.texto)}</p>`;
      if (b.t === "lista") return `<ul>${b.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;
      if (b.t === "tabla") return `<table><thead><tr>${b.cab.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${b.filas.map(f => `<tr>${f.map(c => `<td>${esc(typeof c === "object" ? c.texto : c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      return "";
    }).join("");
  }
  function informePDF(titulo, texto) {
    if (!String(texto).trim()) return toast("No hay texto que analizar.");
    $("#informe").innerHTML = bloquesHTML(L.documentoInforme(titulo, texto)) + `<p class="inf-pie">Generado con la app Legibilidad · https://cjgaland.github.io/legibilidad/</p>`;
    document.body.classList.add("imprimiendo");
    setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove("imprimiendo"), 500); }, 50);
  }
  function informeWord(titulo, texto) {
    if (!String(texto).trim()) return toast("No hay texto que analizar.");
    const doc = L.documentoInforme(titulo, texto);
    const bytes = window.Docx.construirDocx(Object.assign({ pie: "Informe de legibilidad · Generado con la app Legibilidad" }, doc));
    descargar(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `legibilidad-${nombreArchivo(titulo)}.docx`);
  }

  // ---------- Importar copia ----------
  $("#input-importar").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const entrante = j && j.datos ? j.datos : j;
      if (!entrante || !Array.isArray(entrante.textos)) throw new Error("formato");
      const antes = datos.textos.length; datos = L.fusionar(datos, entrante); guardarDatos();
      toast(`Copia importada: ${datos.textos.length - antes} texto(s) nuevo(s).`); router();
    } catch (err) { toast("Ese archivo no es una copia de Legibilidad."); }
  });

  // ---------- Router ----------
  function router() {
    const r = (location.hash.replace(/^#\/?/, "") || "").split("/");
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.r === r[0]));
    if (r[0] === "textos") vistaTextos();
    else if (r[0] === "comparar") vistaComparar();
    else if (r[0] === "aprende") vistaAprende(r[1] != null && r[1] !== "" ? +r[1] : null);
    else if (r[0] === "prueba") vistaPrueba();
    else if (r[0] === "glosario") vistaGlosario();
    else vistaAnalizar();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", router);

  // ---------- Cabecera, modales y versión ----------
  $("#btn-tema").onclick = () => { const t = document.documentElement.getAttribute("data-tema") === "oscuro" ? "claro" : "oscuro"; document.documentElement.setAttribute("data-tema", t); escribe(TEMA, t); };
  $("#btn-acerca").onclick = () => { $("#modal-acerca").hidden = false; };
  $("#btn-acerca-cerrar").onclick = () => { $("#modal-acerca").hidden = true; };
  $("#modal-acerca").addEventListener("click", e => { if (e.target.id === "modal-acerca") $("#modal-acerca").hidden = true; });
  $("#acerca-novedades").innerHTML = `<strong>Novedades</strong>` + C.NOVEDADES.map(n => `<div class="version-item"><div class="version-cab"><b>Versión ${esc(n.v)}</b><span class="version-tag">${esc(n.fecha)}</span></div><ul>${n.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("");
  $("#footer-version").textContent = `Versión ${L.VERSION}`;
  if (!lee(BIENV)) $("#modal-bienvenida").hidden = false;
  $("#btn-bienv-ok").onclick = () => { if ($("#modal-no-repetir").checked) escribe(BIENV, "1"); $("#modal-bienvenida").hidden = true; };

  // ---------- Service worker y aviso de versión nueva ----------
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").then(reg => {
      const avisar = w => {
        if (!w || !navigator.serviceWorker.controller) return;
        const b = document.createElement("div"); b.className = "update-banner"; b.innerHTML = `<span>Nueva versión disponible</span><button>Actualizar</button>`;
        b.querySelector("button").onclick = () => w.postMessage({ type: "SKIP_WAITING" }); document.body.appendChild(b);
      };
      if (reg.waiting) avisar(reg.waiting);
      reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed") avisar(w); }); });
    }).catch(() => {});
    let recargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!recargado) { recargado = true; location.reload(); } });
  }

  router();
})();
