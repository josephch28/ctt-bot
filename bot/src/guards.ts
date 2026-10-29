import { montosAutorizados } from "./catalog.ts";
import type { Curso } from "./db.ts";

export type HallazgoEntrada = { alerta: boolean; motivo: string | null };

const PATRONES_ENTRADA: { motivo: string; re: RegExp }[] = [
  { motivo: "ignora instrucciones", re: /ignora(r)? (todas )?las instrucciones|ignore (all )?(previous|prior) instructions/i },
  { motivo: "cambio de rol", re: /eres ahora|act[uú]a como|you are now|pretend to be|olvida tu (rol|prompt)/i },
  { motivo: "modo desarrollador", re: /modo desarrollador|developer mode|jailbreak|DAN mode/i },
  { motivo: "revelar prompt", re: /revela(r)? (el |tu )?(prompt|sistema|instrucciones)|system prompt/i },
  { motivo: "curso gratis", re: /curso gratis|gratuito|sin costo|de regalado|100\s*%\s*off/i },
  { motivo: "descuento alto", re: /descuento(s)?\s*(del\s*)?(5\d|6\d|7\d|8\d|9\d|100)\s*%|(\b(50|60|70|80|90|100)\s*%\s*(de )?(dto|descuento))/i },
];

export function guardiaEntrada(texto: string): HallazgoEntrada {
  for (const p of PATRONES_ENTRADA) {
    if (p.re.test(texto)) return { alerta: true, motivo: p.motivo };
  }
  return { alerta: false, motivo: null };
}

const RESPUESTA_SEGURA =
  "Solo puedo confirmar precios y descuentos publicados por el CTT. Si necesitas una excepción, te conecto con alguien del centro. ¿Qué curso te interesa?";

function extraerMontos(texto: string): number[] {
  const out: number[] = [];
  for (const m of texto.matchAll(/\$\s*(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,4}(?:[.,]\d{1,2})?)\s*(usd|d[oó]lares)/gi)) {
    const bruto = m[1] ?? m[2];
    const n = Number(bruto?.replace(",", "."));
    if (Number.isFinite(n) && n >= 5) out.push(n);
  }
  return out;
}

function extraerPorcentajes(texto: string): number[] {
  const out: number[] = [];
  for (const m of texto.matchAll(/(\d{1,3})\s*%/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function porcentajesAutorizados(cursos: Curso[]): number[] {
  const { textos } = montosAutorizados(cursos);
  const nums: number[] = [];
  for (const t of textos) {
    for (const m of t.matchAll(/(\d{1,3})\s*%/g)) nums.push(Number(m[1]));
  }
  return nums;
}

export function guardiaSalida(
  reply: string,
  cursos: Curso[],
): { ok: boolean; texto: string } {
  const { numeros } = montosAutorizados(cursos);
  const autorizados = new Set(numeros.map((n) => Math.round(n * 100) / 100));
  const montos = extraerMontos(reply);
  for (const n of montos) {
    const cerca = [...autorizados].some((a) => Math.abs(a - n) < 0.05);
    if (!cerca) return { ok: false, texto: RESPUESTA_SEGURA };
  }
  const pcts = extraerPorcentajes(reply);
  const pctOk = new Set(porcentajesAutorizados(cursos));
  for (const p of pcts) {
    if (!pctOk.has(p)) return { ok: false, texto: RESPUESTA_SEGURA };
  }
  if (/gratis|gratuito|sin costo|de regalado/i.test(reply) && !/no (es|hay) gratis/i.test(reply)) {
    return { ok: false, texto: RESPUESTA_SEGURA };
  }
  return { ok: true, texto: reply };
}
