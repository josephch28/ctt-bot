/** Convierte el texto de Abeja a HTML permitido por Telegram. */

export function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function recortarUrl(crudo: string): { url: string; cola: string } {
  let url = crudo;
  let cola = "";
  while (url.length > 0 && /[),.;:!?]$/.test(url)) {
    cola = url.slice(-1) + cola;
    url = url.slice(0, -1);
  }
  return { url, cola };
}

function etiquetaEnlace(url: string): string {
  if (/docs\.google\.com\/forms/i.test(url)) return "Formulario de inscripción";
  if (/uta\.edu\.ec/i.test(url)) return "Sitio del CTT";
  return "Abrir enlace";
}

function viñetas(texto: string): string {
  return texto
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((linea) =>
      linea
        .replace(/^\s*[-–—]\s+/, "• ")
        .replace(/^\s*\*\s+(?!\*)/, "• "),
    )
    .join("\n");
}

export function aHtmlTelegram(bruto: string): string {
  let t = viñetas(bruto.trim());
  t = escaparHtml(t);
  t = t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  t = t.replace(
    /(^|[\s(•])\*(?!\s)([^*\n]{1,120}?)\*(?=[\s.,;:!?)]|$)/gm,
    "$1<b>$2</b>",
  );
  t = t.replace(/\*/g, "");
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_, etiqueta: string, href: string) => `<a href="${href}">${etiqueta}</a>`,
  );
  t = t.replace(/(?<!href=")(https?:\/\/[^\s<]+)/g, (m) => {
    const { url, cola } = recortarUrl(m);
    if (!url) return m;
    return `<a href="${url}">${etiquetaEnlace(url)}</a>${cola}`;
  });
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

export function planoSinMarcas(bruto: string): string {
  return viñetas(bruto)
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
