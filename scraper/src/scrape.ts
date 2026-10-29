import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { cargarEnv } from "./cargar-env.ts";
import { absolutizar, baseUrl, fetchHtml } from "./http.ts";
import type { Pagina } from "./schema.ts";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dirHtml = join(raiz, "data/raw/html");
const archivoPaginas = join(raiz, "data/raw/paginas.json");

function slugDeUrl(url: string): string {
  const u = new URL(url);
  const nombre = u.pathname.replace(/^\//, "").replace(/\.php$/i, "") || "index";
  return nombre.replace(/[^\w.-]+/g, "_");
}

function textoLimpio($: cheerio.CheerioAPI): string {
  $("script, style, noscript").remove();
  return $("body").text().replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function guardarHtml(url: string, html: string): Promise<void> {
  await mkdir(dirHtml, { recursive: true });
  await writeFile(join(dirHtml, `${slugDeUrl(url)}.html`), html, "utf8");
}

function extraerEnlacesCursos($: cheerio.CheerioAPI): string[] {
  const vistos = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || !/curso\d+\.php/i.test(href)) return;
    const abs = absolutizar(href).replace(/#.*$/, "");
    vistos.add(abs);
  });
  return [...vistos].sort();
}

function siguientePagina($: cheerio.CheerioAPI, actual: string): string | null {
  const rel = $("a[rel='next']").attr("href");
  if (rel) return absolutizar(rel);
  const candidatos: string[] = [];
  $("a[href]").each((_, el) => {
    const t = $(el).text().trim().toLowerCase();
    const href = $(el).attr("href");
    if (!href) return;
    if (/^(siguiente|next|»|›)$/i.test(t) || t.includes("siguiente")) {
      candidatos.push(absolutizar(href));
    }
  });
  const distinto = candidatos.find((u) => u !== actual && !u.endsWith("#"));
  return distinto ?? null;
}

async function rasparPagina(
  url: string,
  tipo: Pagina["tipo"],
): Promise<Pagina> {
  console.log(`GET ${url}`);
  const html = await fetchHtml(url);
  await guardarHtml(url, html);
  const $ = cheerio.load(html);
  const titulo =
    $("h1.tituloCurso").first().text().trim() ||
    $("h1").last().text().trim() ||
    $("title").text().trim();
  return { url, tipo, titulo, texto: textoLimpio($) };
}

async function rasparCatalogo(): Promise<{ paginas: Pagina[]; cursos: string[] }> {
  const paginas: Pagina[] = [];
  const cursos = new Set<string>();
  let url: string | null = `${baseUrl()}/course.php`;
  const visitadas = new Set<string>();

  while (url && !visitadas.has(url)) {
    visitadas.add(url);
    console.log(`GET ${url}`);
    const html = await fetchHtml(url);
    await guardarHtml(url, html);
    const $ = cheerio.load(html);
    paginas.push({
      url,
      tipo: "catalogo",
      titulo: $("h1").last().text().trim() || "Cursos",
      texto: textoLimpio($),
    });
    for (const c of extraerEnlacesCursos($)) cursos.add(c);
    url = siguientePagina($, url);
  }

  return { paginas, cursos: [...cursos].sort() };
}

async function main(): Promise<void> {
  cargarEnv();
  const paginas: Pagina[] = [];
  paginas.push(await rasparPagina(`${baseUrl()}/index.php`, "home"));
  paginas.push(await rasparPagina(`${baseUrl()}/contact.php`, "contacto"));

  const { paginas: catalogos, cursos } = await rasparCatalogo();
  paginas.push(...catalogos);
  console.log(`Cursos únicos en catálogo: ${cursos.length}`);

  for (const cursoUrl of cursos) {
    paginas.push(await rasparPagina(cursoUrl, "curso"));
  }

  await mkdir(dirname(archivoPaginas), { recursive: true });
  await writeFile(archivoPaginas, JSON.stringify(paginas, null, 2), "utf8");
  console.log(`Guardado ${paginas.length} páginas en ${archivoPaginas}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
