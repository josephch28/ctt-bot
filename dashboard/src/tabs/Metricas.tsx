import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { etiquetaEstado } from "../lib/urgencia.ts";
import type { Conversacion, Curso, Estado } from "../lib/types.ts";

export function Metricas() {
  const [convs, setConvs] = useState<Conversacion[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);

  useEffect(() => {
    void supabase
      .from("conversations")
      .select("*")
      .then(({ data }) => setConvs((data as Conversacion[]) ?? []));
    void supabase
      .from("courses")
      .select("id, nombre")
      .then(({ data }) => setCursos((data as Curso[]) ?? []));
  }, []);

  const ahora = Date.now();
  const activas24 = convs.filter((c) => ahora - new Date(c.updated_at).getTime() < 24 * 3600 * 1000).length;
  const calientes = convs.filter((c) => c.estado === "lead_caliente").length;
  const soloIa = convs.length
    ? Math.round((100 * convs.filter((c) => c.handover_count === 0).length) / convs.length)
    : 0;
  const tokensProm = convs.length
    ? Math.round(convs.reduce((a, c) => a + (c.tokens_usados ?? 0), 0) / convs.length)
    : 0;
  const porEstado = useMemo(() => {
    const m: Record<Estado, number> = {
      interesado: 0,
      dudoso: 0,
      frustrado: 0,
      lead_caliente: 0,
    };
    for (const c of convs) m[c.estado] += 1;
    return m;
  }, [convs]);
  const maxBarra = Math.max(1, ...Object.values(porEstado));
  const top = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const c of convs) {
      if (!c.curso_interes) continue;
      cuenta.set(c.curso_interes, (cuenta.get(c.curso_interes) ?? 0) + 1);
    }
    return [...cuenta.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => ({
        n,
        nombre: cursos.find((x) => x.id === id)?.nombre ?? id,
      }));
  }, [convs, cursos]);

  function exportarCsv() {
    const leads = convs.filter((c) => c.estado === "lead_caliente");
    const filas = [
      ["id", "nombre", "username", "estado", "intencion", "tokens", "traspasos", "updated_at"],
      ...leads.map((c) => [
        c.id,
        c.nombre ?? "",
        c.username ?? "",
        c.estado,
        c.intencion ?? "",
        String(c.tokens_usados),
        String(c.handover_count),
        c.updated_at,
      ]),
    ];
    const csv = filas.map((f) => f.map((x) => `"${x.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leads-colmena.csv";
    a.click();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tarjeta titulo="Activas 24 h" valor={String(activas24)} />
        <Tarjeta titulo="Leads calientes" valor={String(calientes)} />
        <Tarjeta titulo="% solo IA" valor={`${soloIa}%`} />
        <Tarjeta titulo="Tokens promedio" valor={String(tokensProm)} />
      </div>
      <section className="rounded-xl border border-amber-900/50 bg-[#1c140c] p-4">
        <h2 className="mb-3 font-semibold">Por estado</h2>
        {(Object.keys(porEstado) as Estado[]).map((e) => (
          <div key={e} className="mb-2">
            <div className="mb-1 flex justify-between text-xs text-amber-400">
              <span>{etiquetaEstado[e]}</span>
              <span>{porEstado[e]}</span>
            </div>
            <div className="h-3 rounded-full bg-black/40">
              <div
                className="h-3 rounded-full bg-amber-500"
                style={{ width: `${(100 * porEstado[e]) / maxBarra}%` }}
              />
            </div>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-amber-900/50 bg-[#1c140c] p-4">
        <h2 className="mb-3 font-semibold">Top cursos consultados</h2>
        {top.length === 0 ? (
          <p className="text-sm text-amber-500">Aún no hay cursos de interés.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {top.map((t) => (
              <li key={t.nombre}>
                {t.nombre} · {t.n}
              </li>
            ))}
          </ol>
        )}
      </section>
      <button
        type="button"
        onClick={exportarCsv}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-stone-900"
      >
        Exportar CSV de leads
      </button>
    </div>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-amber-900/50 bg-[#1c140c] p-4">
      <p className="text-xs text-amber-500">{titulo}</p>
      <p className="text-2xl font-semibold text-amber-100">{valor}</p>
    </div>
  );
}
