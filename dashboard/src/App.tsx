import { useState } from "react";
import { Conversaciones } from "./tabs/Conversaciones.tsx";
import { Cursos } from "./tabs/Cursos.tsx";
import { Metricas } from "./tabs/Metricas.tsx";
import { useRealtimeEstado } from "./lib/useRealtimeEstado.ts";

type Pestana = "conversaciones" | "metricas" | "cursos";

export function App() {
  const [tab, setTab] = useState<Pestana>("conversaciones");
  const { conectado, alertas } = useRealtimeEstado();

  return (
    <div className="min-h-screen bg-[#140e08] text-amber-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/60 bg-[#1c140c] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🍯
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-amber-200">Colmena</h1>
            <p className="text-xs text-amber-500/80">CTT FISEI-UTA · handover en vivo</p>
          </div>
        </div>
        <nav className="flex gap-1 rounded-full bg-black/30 p-1">
          {(
            [
              ["conversaciones", "Conversaciones"],
              ["metricas", "Métricas"],
              ["cursos", "Cursos"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                tab === id ? "bg-amber-500 text-stone-900" : "text-amber-200 hover:bg-amber-900/40"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${conectado ? "bg-emerald-400 dot-vivo" : "bg-red-500"}`}
            title={conectado ? "Realtime conectado" : "Realtime desconectado"}
          />
          <span className="text-amber-300/80">{conectado ? "Realtime" : "Sin Realtime"}</span>
          {alertas > 0 ? (
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs text-white">{alertas}</span>
          ) : null}
        </div>
      </header>
      <main className="p-3">
        {tab === "conversaciones" ? <Conversaciones /> : null}
        {tab === "metricas" ? <Metricas /> : null}
        {tab === "cursos" ? <Cursos /> : null}
      </main>
    </div>
  );
}
