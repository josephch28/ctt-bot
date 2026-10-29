import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const dirHtml = join(dirname(fileURLToPath(import.meta.url)), "../../data/raw/html");

function valorLista($: cheerio.CheerioAPI, etiqueta: string): string | null {
  let encontrado: string | null = null;
  $("div.tab1 li").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    const m = t.match(new RegExp(`^${etiqueta}:\\s*(.*)$`, "i"));
    if (m?.[1]) encontrado = m[1].trim();
  });
  return encontrado;
}

function precios($: cheerio.CheerioAPI): { publico: string | null; otros: string[] } {
  const items: string[] = [];
  $("div.tab1 li").each((_, el) => {
    items.push($(el).text().replace(/\s+/g, " ").trim());
  });
  const publico = items.find((t) => /p[uú]blico en general/i.test(t)) ?? null;
  const otros = items.filter(
    (t) => /\$|usd/i.test(t) && t !== publico && !/^precio para los asistentes/i.test(t),
  );
  return { publico, otros };
}

async function main(): Promise<void> {
  const archivos = (await readdir(dirHtml)).filter((f) => /^curso\d+\.html$/i.test(f));
  const filas: {
    archivo: string;
    nombre: string;
    precio: string;
    modalidad: string;
    fecha: string;
    certificacion: string;
  }[] = [];

  for (const archivo of archivos.sort()) {
    const $ = cheerio.load(await readFile(join(dirHtml, archivo), "utf8"));
    const { publico } = precios($);
    filas.push({
      archivo,
      nombre: $("h1.tituloCurso").first().text().replace(/\s+/g, " ").trim() || "(sin título)",
      precio: publico ?? valorLista($, "Precio para los asistentes") ?? "(no consta)",
      modalidad: valorLista($, "Modalidad") ?? "(no consta)",
      fecha: valorLista($, "Fecha del curso") ?? "(no consta)",
      certificacion: valorLista($, "Tipo de capacitación") ?? "(no consta)",
    });
  }

  console.log(JSON.stringify(filas, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
