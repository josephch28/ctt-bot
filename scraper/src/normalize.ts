import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { cargarEnv } from "./cargar-env.ts";
import {
  cursoNormalizadoSchema,
  faqsArchivoSchema,
  paginaSchema,
  type CursoNormalizado,
  type Pagina,
} from "./schema.ts";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "../..");
const archivoPaginas = join(raiz, "data/raw/paginas.json");
const archivoCursos = join(raiz, "data/raw/cursos.json");
const archivoFaqs = join(raiz, "data/faqs.json");

function clienteLlm(): OpenAI {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("Falta LLM_API_KEY en el entorno (.env).");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://api.x.ai/v1",
  });
}

function modelo(): string {
  return process.env.LLM_MODEL ?? "grok-4-fast-non-reasoning";
}

const sistemaCurso = `Eres un extractor fiel. Recibes el texto de UNA página del CTT FISEI-UTA.
Devuelve un único JSON (response json_object) con exactamente estas claves:
nombre, descripcion, temario, requisitos, horas, modalidad, horario, fecha_inicio,
precio, descuentos, certificacion, cupos, docente, link_inscripcion, publico, keywords,
url_origen, activo.

Reglas inmutables:
- Si un dato no aparece en el texto, usa null (descuentos = [] si no hay).
- PROHIBIDO inventar precios, descuentos, fechas, cupos, enlaces o certificaciones.
- horas y cupos son enteros o null. precio es número (sin símbolo $) o null.
- Si hay varios precios (estudiante / graduados / público): precio = el del público en general.
  Los demás van a descuentos como textos literales del sitio (copia exacta, con montos).
- fecha_inicio: usa el texto de "Fecha del curso" si existe; si no, null.
- keywords: 5 a 10 términos del contenido, minúsculas, sin tildes.
- url_origen: la URL de esta página.
- activo: true salvo que el texto diga cerrado, inactivo o finalizado.
- temario: lista de módulos/contenidos unidos con saltos de línea.
- requisitos: conocimientos previos y materiales si aparecen.
- docente: nombres de instructores.
- publico: beneficiarios.
- certificacion: tipo de capacitación / certificado tal como está escrito.
- link_inscripcion: URL del botón de registro si aparece.`;

const sistemaFaqs = `Extrae FAQ solo con datos que aparezcan en el texto (pagos, ubicación, contacto, certificados).
JSON: { "faqs": [ { "pregunta": "...", "respuesta": "..." } ] }.
PROHIBIDO inventar. Si no hay dato, no crees esa pregunta. Español de Ecuador.`;

function numeroONull(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const n = Number(valor.replace(/[^\d,.-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function enteroONull(valor: unknown): number | null {
  const n = numeroONull(valor);
  return n === null ? null : Math.round(n);
}

function textoONull(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string") return valor.trim() || null;
  if (Array.isArray(valor)) {
    const t = valor
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join("\n")
      .trim();
    return t || null;
  }
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function prepararCurso(raw: unknown, url: string): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  for (const clave of [
    "nombre",
    "descripcion",
    "temario",
    "requisitos",
    "modalidad",
    "horario",
    "fecha_inicio",
    "certificacion",
    "docente",
    "link_inscripcion",
    "publico",
  ] as const) {
    o[clave] = textoONull(o[clave]);
  }
  o.precio = numeroONull(o.precio);
  o.horas = enteroONull(o.horas);
  if (o.cupos && typeof o.cupos === "object" && "maximo" in o.cupos) {
    o.cupos = enteroONull((o.cupos as { maximo: unknown }).maximo);
  } else {
    o.cupos = enteroONull(o.cupos);
  }
  if (!Array.isArray(o.descuentos)) {
    o.descuentos = o.descuentos == null ? [] : [String(o.descuentos)];
  } else {
    o.descuentos = o.descuentos.map((d) =>
      typeof d === "string" ? d : JSON.stringify(d),
    );
  }
  if (Array.isArray(o.keywords)) {
    o.keywords = o.keywords
      .map(String)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  if (typeof o.activo !== "boolean") o.activo = o.activo !== "false" && o.activo !== 0;
  o.url_origen = typeof o.url_origen === "string" ? o.url_origen : url;
  return o;
}

async function completarJson(
  client: OpenAI,
  system: string,
  user: string,
): Promise<string> {
  const res = await client.chat.completions.create({
    model: modelo(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices[0]?.message.content;
  if (!content) throw new Error("LLM sin contenido");
  return content;
}

async function normalizarCurso(
  client: OpenAI,
  pagina: Pagina,
): Promise<CursoNormalizado> {
  const user = `URL: ${pagina.url}\nTítulo: ${pagina.titulo}\n\n${pagina.texto}`;
  let ultimoError: unknown;
  for (let intento = 0; intento < 2; intento++) {
    try {
      const bruto = await completarJson(client, sistemaCurso, user);
      return cursoNormalizadoSchema.parse(prepararCurso(JSON.parse(bruto), pagina.url));
    } catch (err) {
      ultimoError = err;
      console.warn(`Reintento ${intento + 1} para ${pagina.url}: ${String(err)}`);
    }
  }
  throw ultimoError;
}

async function extraerFaqs(client: OpenAI, paginas: Pagina[]): Promise<unknown> {
  const bloque = paginas
    .map((p) => `## ${p.tipo} ${p.url}\n${p.texto}`)
    .join("\n\n");
  const bruto = await completarJson(client, sistemaFaqs, bloque);
  const parsed: unknown = JSON.parse(bruto);
  const faqs =
    parsed && typeof parsed === "object" && "faqs" in parsed
      ? (parsed as { faqs: unknown }).faqs
      : parsed;
  return faqsArchivoSchema.parse(faqs);
}

async function main(): Promise<void> {
  cargarEnv();
  const client = clienteLlm();
  const paginas = paginaSchema
    .array()
    .parse(JSON.parse(await readFile(archivoPaginas, "utf8")));

  const cursosPaginas = paginas.filter((p) => p.tipo === "curso");
  const cursos: CursoNormalizado[] = [];
  for (const pagina of cursosPaginas) {
    console.log(`Normalizando ${pagina.url}`);
    cursos.push(await normalizarCurso(client, pagina));
    await new Promise((r) => setTimeout(r, 400));
  }

  const contextoFaq = paginas.filter(
    (p) => p.tipo === "home" || p.tipo === "contacto" || p.tipo === "catalogo",
  );
  const faqs = await extraerFaqs(client, contextoFaq);

  await writeFile(archivoCursos, JSON.stringify(cursos, null, 2), "utf8");
  await writeFile(archivoFaqs, JSON.stringify(faqs, null, 2), "utf8");
  console.log(`Cursos: ${cursos.length}. FAQs: ${Array.isArray(faqs) ? faqs.length : "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
