import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { cargarEnv } from "./cargar-env.ts";
import {
  cursoNormalizadoSchema,
  faqsArchivoSchema,
  type CursoNormalizado,
} from "./schema.ts";

type FilaCurso = CursoNormalizado & { actualizado_en: string };
type FilaFaq = { pregunta: string; respuesta: string };
type Resultado = PromiseLike<{ error: { message: string } | null }>;

const raiz = join(dirname(fileURLToPath(import.meta.url)), "../..");

function cliente() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main(): Promise<void> {
  cargarEnv();
  const supabase = cliente();
  const cursos = cursoNormalizadoSchema.array().parse(
    JSON.parse(await readFile(join(raiz, "data/raw/cursos.json"), "utf8")),
  );
  const faqs = faqsArchivoSchema.parse(
    JSON.parse(await readFile(join(raiz, "data/faqs.json"), "utf8")),
  );

  const tablaCursos = supabase.from("courses") as unknown as {
    upsert: (filas: FilaCurso[], opts: { onConflict: string }) => Resultado;
  };
  const { error: errCursos } = await tablaCursos.upsert(
    cursos.map((c) => ({ ...c, actualizado_en: new Date().toISOString() })),
    { onConflict: "url_origen" },
  );
  if (errCursos) throw new Error(errCursos.message);

  const tablaFaqs = supabase.from("faqs") as unknown as {
    delete: () => { neq: (col: "id", val: number) => Resultado };
    insert: (filas: FilaFaq[]) => Resultado;
  };
  const { error: errDel } = await tablaFaqs.delete().neq("id", 0);
  if (errDel) throw new Error(errDel.message);
  if (faqs.length > 0) {
    const { error: errFaqs } = await tablaFaqs.insert(faqs);
    if (errFaqs) throw new Error(errFaqs.message);
  }

  console.log(`Upsert ${cursos.length} cursos por url_origen. FAQs: ${faqs.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
