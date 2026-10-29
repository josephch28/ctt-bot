import type { Curso } from "./db.ts";
import { sinTildes } from "./catalog.ts";

const MESES: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

export type RangoFechas = { inicio: Date | null; fin: Date | null };

function diaUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function hoyUtc(ahora: Date): Date {
  return diaUtc(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/** Extrae inicio y fin de textos tipo "Del 16 de octubre de 2026 al 05 de diciembre de 2026". */
export function extraerRangoFechas(texto: string | null): RangoFechas {
  if (!texto) return { inicio: null, fin: null };
  const plano = sinTildes(texto);
  const hallados: { pos: number; dia: number; mes: number; anio: number | null }[] = [];

  const reLargo = /(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/g;
  for (const m of plano.matchAll(reLargo)) {
    const mes = MESES[m[2] ?? ""];
    if (mes == null || m.index == null) continue;
    hallados.push({
      pos: m.index,
      dia: Number(m[1]),
      mes,
      anio: m[3] ? Number(m[3]) : null,
    });
  }

  const reCorto = /(\d{1,2})-([a-z]+)(?:-(\d{4}))?/g;
  for (const m of plano.matchAll(reCorto)) {
    const mes = MESES[m[2] ?? ""];
    if (mes == null || m.index == null) continue;
    hallados.push({
      pos: m.index,
      dia: Number(m[1]),
      mes,
      anio: m[3] ? Number(m[3]) : null,
    });
  }

  hallados.sort((a, b) => a.pos - b.pos);
  let ultimoAnio: number | null = null;
  for (let i = hallados.length - 1; i >= 0; i--) {
    const h = hallados[i];
    if (!h) continue;
    if (h.anio != null) ultimoAnio = h.anio;
    else if (ultimoAnio != null) h.anio = ultimoAnio;
  }

  const fechas = hallados
    .filter((h) => h.anio != null)
    .map((h) => diaUtc(h.anio as number, h.mes, h.dia));
  if (fechas.length === 0) return { inicio: null, fin: null };
  return {
    inicio: fechas[0] ?? null,
    fin: fechas[fechas.length - 1] ?? null,
  };
}

function esAutodidacta(modalidad: string | null): boolean {
  const m = sinTildes(modalidad ?? "");
  return /autodidacta|self-paced|elearning|e-learning|mooc|auto-didacta/.test(m);
}

/**
 * Inscribible: edición no vencida.
 * Presencial/híbrida/virtual con clases: aún no empieza.
 * Autodidacta/MOOC: sigue abierto hasta la fecha de fin.
 */
export function cursoInscribible(curso: Curso, ahora = new Date()): boolean {
  if (curso.activo === false) return false;
  const { inicio, fin } = extraerRangoFechas(curso.fecha_inicio);
  const hoy = hoyUtc(ahora).getTime();
  if (esAutodidacta(curso.modalidad)) {
    const cierre = fin ?? inicio;
    if (!cierre) return true;
    return cierre.getTime() >= hoy;
  }
  const arranque = inicio ?? fin;
  if (!arranque) return true;
  return arranque.getTime() >= hoy;
}

export function cursosVigentes(cursos: Curso[], ahora = new Date()): Curso[] {
  return cursos.filter((c) => cursoInscribible(c, ahora));
}
