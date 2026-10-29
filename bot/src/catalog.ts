import type { Curso } from "./db.ts";

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
    if (k && q.includes(k)) n += 2;
  }
  const nombre = sinTildes(curso.nombre ?? "");
  if (nombre && q.includes(nombre)) n += 3;
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

export function fichaCompleta(curso: Curso): string {
  const descuentos = Array.isArray(curso.descuentos)
    ? curso.descuentos.map(String).join(" · ")
    : "";
  return [
    `id: ${curso.id}`,
    `nombre: ${curso.nombre}`,
    `descripcion: ${recortar(curso.descripcion)}`,
    `temario: ${recortar(curso.temario, 360)}`,
    `requisitos: ${recortar(curso.requisitos, 280)}`,
    `horas: ${curso.horas}`,
    `modalidad: ${curso.modalidad}`,
    `horario: ${curso.horario}`,
    `fecha_inicio: ${curso.fecha_inicio}`,
    `precio_publico: ${curso.precio}`,
    `descuentos_autorizados: ${descuentos || "ninguno"}`,
    `certificacion: ${recortar(curso.certificacion, 200)}`,
    `cupos: ${curso.cupos}`,
    `docente: ${recortar(curso.docente, 120)}`,
    `publico: ${recortar(curso.publico, 160)}`,
    `link_inscripcion: ${curso.link_inscripcion}`,
  ].join("\n");
}

export function tresMasRelevantes(cursos: Curso[], consulta: string): Curso[] {
  return [...cursos]
    .map((c) => ({ c, p: puntaje(c, consulta) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 3)
    .map((x) => x.c);
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
