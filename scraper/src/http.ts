import { Agent, fetch as undiciFetch } from "undici";

const PAUSA_MS = 1500;

/** El certificado TLS del sitio CTT no entrega la cadena completa. */
const agenteTls = new Agent({ connect: { rejectUnauthorized: false } });

let ultimaPeticion = 0;

export function userAgent(): string {
  return (
    process.env.SCRAPER_UA ??
    "ctt-bot-hackaton/1.0 (+https://github.com/josephch28/ctt-bot)"
  );
}

export function baseUrl(): string {
  return (process.env.CTT_BASE_URL ?? "https://ctt-talleresfisei.uta.edu.ec").replace(
    /\/$/,
    "",
  );
}

/** Pausa de 1,5 s entre peticiones y User-Agent configurado. */
export async function fetchHtml(url: string): Promise<string> {
  const espera = PAUSA_MS - (Date.now() - ultimaPeticion);
  if (ultimaPeticion > 0 && espera > 0) {
    await new Promise((r) => setTimeout(r, espera));
  }
  const res = await undiciFetch(url, {
    dispatcher: agenteTls,
    headers: {
      "User-Agent": userAgent(),
      Accept: "text/html,application/xhtml+xml",
    },
  });
  ultimaPeticion = Date.now();
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status}`);
  }
  return await res.text();
}

export function absolutizar(href: string): string {
  return new URL(href, `${baseUrl()}/`).href;
}
