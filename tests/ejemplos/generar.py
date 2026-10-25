# Genera los archivos de ejemplo de las pruebas (texto inventado, sin datos reales).
# Uso: python3 tests/ejemplos/generar.py   (solo librería estándar de Python)
import os, textwrap, zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))

TITULO = "Cuidados de la herida después de la operación"
APARTADOS = [
    ("Qué le hemos hecho", [
        "Le hemos operado de una hernia en la ingle. La operación ha ido bien.",
        "Tras la intervención quirúrgica, realizada mediante abordaje anterior con colocación de malla protésica, se procederá a la deambulación precoz y a la reintroducción progresiva de la ingesta oral según tolerancia, debiendo evitarse la realización de esfuerzos físicos que incrementen la presión intraabdominal durante el postoperatorio inmediato.",
    ]),
    ("Cómo cuidar la herida", [
        "Lávese las manos antes de tocar la herida.",
        "Puede ducharse a partir de mañana. Seque la herida con una toalla limpia, sin frotar.",
        "No se bañe en la bañera ni en la piscina hasta que le quiten los puntos.",
    ]),
    ("Cuándo volver a Urgencias", [
        "Vuelva a Urgencias o llame al 112 si tiene fiebre de más de 38 grados, si la herida está roja y caliente o si sale pus.",
        "¿Tiene dudas? Llame a su centro de salud.",
    ]),
]

# ---------- TXT (líneas partidas a mano, como un texto ajustado) ----------
def txt():
    out = [TITULO.upper(), ""]
    for t, ps in APARTADOS:
        out += [t, ""]
        for p in ps:
            out += textwrap.wrap(p, 60) + [""]
    with open(os.path.join(AQUI, "informe-ejemplo.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(out))

# ---------- MD ----------
def md():
    out = ["---", "autor: ejemplo", "---", "", "# " + TITULO, ""]
    for i, (t, ps) in enumerate(APARTADOS):
        out += ["## " + t, ""] if i != 1 else [t, "-" * len(t), ""]
        for j, p in enumerate(ps):
            if i == 1:
                out.append("- " + p.replace("manos", "**manos**").replace("toalla limpia", "[toalla limpia](https://example.org)"))
            else:
                out += textwrap.wrap(p, 70) + [""]
        out.append("")
    out += ["```", "codigo que no se debe contar", "```", "", "| Día | Qué hacer |", "|---|---|", "| 1 | Descansar |", ""]
    with open(os.path.join(AQUI, "informe-ejemplo.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out))

# ---------- DOCX (estilos con id en español, como los crea Word en castellano) ----------
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def docx():
    W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
    def p(texto, estilo=None):
        ppr = f'<w:pPr><w:pStyle w:val="{estilo}"/><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr>' if estilo else ""
        return f'<w:p>{ppr}<w:r><w:t xml:space="preserve">{esc(texto)}</w:t></w:r></w:p>'
    cuerpo = [p(TITULO, "Puesto")]
    for i, (t, ps) in enumerate(APARTADOS):
        cuerpo.append(p(t, "Ttulo1" if i != 2 else "Heading2"))
        for q in ps:
            a, b = q[: len(q) // 2], q[len(q) // 2:]
            cuerpo.append(f'<w:p><w:r><w:t xml:space="preserve">{esc(a)}</w:t></w:r><w:del w:id="1" w:author="x"><w:r><w:delText>TEXTO BORRADO</w:delText></w:r></w:del><w:r><w:t>{esc(b)}</w:t></w:r></w:p>')
    cuerpo.append('<w:p/>')
    cuerpo.append('<w:tbl><w:tr><w:tc>' + p("Teléfono del centro") + '</w:tc><w:tc><w:p><w:r><w:t>957</w:t><w:tab/><w:t>000 000</w:t></w:r></w:p></w:tc></w:tr></w:tbl>')
    document = f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {W}><w:body>{"".join(cuerpo)}</w:body></w:document>'
    styles = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles {W}>'
              '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
              '<w:style w:type="paragraph" w:styleId="Puesto"><w:name w:val="Title"/></w:style>'
              '<w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style>'
              '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>'
              '</w:styles>')
    ctypes = ('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
              '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
              '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
              '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
    drels = ('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
             '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    with zipfile.ZipFile(os.path.join(AQUI, "informe-ejemplo.docx"), "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", ctypes)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document)
        z.writestr("word/_rels/document.xml.rels", drels)
        z.writestr("word/styles.xml", styles)

# ---------- PDF (escrito a mano: Helvetica, títulos a 15 pt y texto a 11 pt) ----------
def pdf_texto(s):
    b = s.encode("cp1252")
    return b.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")

def escribir_pdf(nombre, paginas):
    # paginas: lista de contenidos (bytes) de cada página
    objs = []
    n = len(paginas)
    kids = " ".join(f"{3 + 2 * i} 0 R" for i in range(n))
    fuente = 3 + 2 * n
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objs.append(f"<< /Type /Pages /Kids [{kids}] /Count {n} >>".encode())
    for i, cont in enumerate(paginas):
        objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 {fuente} 0 R >> >> /Contents {4 + 2 * i} 0 R >>".encode())
        objs.append(f"<< /Length {len(cont)} >>\nstream\n".encode() + cont + b"\nendstream")
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    pos = []
    for i, o in enumerate(objs):
        pos.append(len(out))
        out += f"{i + 1} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for p in pos:
        out += f"{p:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    with open(os.path.join(AQUI, nombre), "wb") as f:
        f.write(out)

def pdf():
    paginas = []
    for i, (t, ps) in enumerate(APARTADOS):
        y = 800
        lineas = [(9, 60, y, "Hospital de Ejemplo · Hoja informativa")]
        y -= 40
        if i == 0:
            lineas.append((15, 60, y, TITULO)); y -= 30
        lineas.append((15, 60, y, t)); y -= 24
        for p in ps:
            for l in textwrap.wrap(p, 80):
                lineas.append((11, 60, y, l)); y -= 14
            y -= 10
        lineas.append((9, 280, 40, f"Página {i + 1} de {len(APARTADOS)}"))
        cont = b"".join(b"BT /F1 %d Tf %d %d Td (" % (s, x, yy) + pdf_texto(tx) + b") Tj ET\n" for s, x, yy, tx in lineas)
        paginas.append(cont)
    escribir_pdf("informe-ejemplo.pdf", paginas)
    # Un PDF «escaneado»: solo dibujo, sin texto
    escribir_pdf("informe-escaneado.pdf", [b"0.8 g 60 400 475 300 re f 0 g 80 650 m 500 650 l S"])

if __name__ == "__main__":
    txt(); md(); docx(); pdf()
    print("Ejemplos generados en", AQUI)
