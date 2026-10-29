import type { Curso } from "./db.ts";
import { LINK_INSCRIPCION } from "./inscripcion.ts";

export function sinTildes(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function puntaje(curso: Curso, consulta: string): number {
  const q = sinTildes(consulta);
  let n = 0;
  for (const kw of curso.keywords ?? []) {
    const k = sinTildes(kw);
    if (k.length >= 3 && q.includes(k)) n += 3;
  }
  const nombre = sinTildes(curso.nombre ?? "");
  if (nombre && q.includes(nombre)) n += 5;
  const blob = sinTildes(
    [curso.nombre, curso.modalidad, curso.certificacion, curso.descripcion, curso.publico]
      .filter(Boolean)
      .join(" "),
  );
  for (const w of q.split(/[^a-z0-9]+/).filter((x) => x.length >= 4)) {
    if (nombre.includes(w)) n += 4;
    else if (blob.includes(w)) n += 1;
  }
  return n;
}

export function indiceUnaLinea(curso: Curso): string {
  const precio = curso.precio == null ? "precio no publicado" : `USD ${curso.precio}`;
  return `${curso.id} | ${curso.nombre ?? "sin nombre"} | ${curso.modalidad ?? "?"} | ${curso.fecha_inicio ?? "?"} | ${precio}`;
}

function recortar(valor: string | null, max = 420): string {
  if (!valor) return "";
  const t = valor.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function fichaCorta(curso: Curso): string {
  const descuentos = Array.isArray(curso.descuentos)
    ? curso.descuentos.map(String).join(" · ")
    : "";
  return [
    `id: ${curso.id}`,
    `nombre: ${curso.nombre}`,
    `modalidad: ${curso.modalidad}`,
    `fecha: ${curso.fecha_inicio}`,
    `horario: ${curso.horario}`,
    `horas: ${curso.horas}`,
    `precio_publico: ${curso.precio}`,
    `descuentos: ${descuentos || "ninguno"}`,
    `certificacion: ${recortar(curso.certificacion, 100)}`,
    `docente: ${curso.docente ?? "no publicado en la ficha"}`,
    `link_inscripcion: ${LINK_INSCRIPCION}`,
  ].join("\n");
}

export function fichaCompleta(curso: Curso): string {
  return fichaCorta(curso);
}

export function pideListado(consulta: string): boolean {
  return /qu[eé]\s+cursos|cat[aá]logo|cu[aá]ntos cursos|qu[eé] ofrecen|disponibles|hay cursos/i.test(
    consulta,
  );
}

export function relevantes(cursos: Curso[], consulta: string, max = 2): Curso[] {
  const ranked = [...cursos]
    .map((c) => ({ c, p: puntaje(c, consulta) }))
    .sort((a, b) => b.p - a.p);
  const conPuntos = ranked.filter((x) => x.p > 0).slice(0, max);
  if (conPuntos.length > 0) return conPuntos.map((x) => x.c);
  if (pideListado(consulta)) return ranked.slice(0, max).map((x) => x.c);
  return [];
}

export function tresMasRelevantes(cursos: Curso[], consulta: string): Curso[] {
  return relevantes(cursos, consulta, 3);
}

export function montosAutorizados(cursos: Curso[]): { numeros: number[]; textos: string[] } {
  const numeros: number[] = [];
  const textos: string[] = [];
  for (const c of cursos) {
    if (typeof c.precio === "number") numeros.push(c.precio);
    const lista = Array.isArray(c.descuentos) ? c.descuentos.map(String) : [];
    for (const t of lista) {
      textos.push(t);
      for (const m of t.matchAll(/(\d+[.,]?\d*)/g)) {
        const n = Number(m[1]?.replace(",", "."));
        if (Number.isFinite(n)) numeros.push(n);
      }
    }
  }
  return { numeros, textos };
}
