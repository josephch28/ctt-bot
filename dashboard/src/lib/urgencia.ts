import type { Conversacion, Estado } from "./types.ts";

export function rangoUrgencia(c: Conversacion): number {
  if (c.estado === "frustrado" || c.mode === "human") return 0;
  if (c.estado === "lead_caliente") return 1;
  if (c.estado === "dudoso") return 2;
  return 3;
}

export function ordenarConversaciones(lista: Conversacion[]): Conversacion[] {
  return [...lista].sort((a, b) => {
    const d = rangoUrgencia(a) - rangoUrgencia(b);
    if (d !== 0) return d;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export const colorEstado: Record<Estado, string> = {
  interesado: "#fbbf24",
  dudoso: "#fb923c",
  frustrado: "#f87171",
  lead_caliente: "#4ade80",
};

export const etiquetaEstado: Record<Estado, string> = {
  interesado: "Interesado",
  dudoso: "Dudoso",
  frustrado: "Frustrado",
  lead_caliente: "Lead caliente",
};
