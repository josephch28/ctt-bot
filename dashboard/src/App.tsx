import { useCallback, useState } from "react";
import { Conversaciones } from "./tabs/Conversaciones.tsx";
import { Cursos } from "./tabs/Cursos.tsx";
import { Metricas } from "./tabs/Metricas.tsx";
import { useRealtimeEstado } from "./lib/useRealtimeEstado.ts";

type Pestana = "conversaciones" | "metricas" | "cursos";

export function App() {
  const [tab, setTab] = useState<Pestana>("conversaciones");
  const [abrirId, setAbrirId] = useState<string | null>(null);

  const irAlChat = useCallback((id: string) => {
    setTab("conversaciones");
    setAbrirId(id);
  }, []);

  const { conectado, pendientes, toasts, permiso, activarAvisos, abrir, cerrarToast } =
    useRealtimeEstado(irAlChat);

  function abrirPendiente(id: string) {
    abrir(id);
  }

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
          {permiso === "default" ? (
            <button
              type="button"
              className="rounded-full border border-amber-700 px-2 py-0.5 text-xs text-amber-200"
              onClick={() => void activarAvisos()}
            >
              Activar avisos
            </button>
          ) : null}
          {pendientes.length > 0 ? (
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-xs text-white">
              {pendientes.length} operador
            </span>
          ) : null}
        </div>
      </header>
      {pendientes.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-red-900/50 bg-red-950/40 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-red-300">
            Deben atenderse
          </span>
          {pendientes.map((a) => (
            <button
              key={a.conversationId}
              type="button"
              className="rounded-full bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-600"
              onClick={() => abrirPendiente(a.conversationId)}
            >
              {a.nombre} · {a.motivo === "frustrado" ? "frustrado" : "handover"}
            </button>
          ))}
        </div>
      ) : null}
      <main className="p-3">
        {tab === "conversaciones" ? <Conversaciones abrirId={abrirId} /> : null}
        {tab === "metricas" ? <Metricas /> : null}
        {tab === "cursos" ? <Cursos /> : null}
      </main>
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((a) => (
          <div
            key={a.conversationId}
            className="pointer-events-auto rounded-xl border border-red-800 bg-[#2a120c] p-3 shadow-lg"
          >
            <p className="text-sm font-semibold text-red-200">Abeja pide un operador</p>
            <p className="mt-1 text-sm text-amber-100">{a.nombre}</p>
            <p className="truncate text-xs text-amber-400">{a.detalle}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-red-700 px-3 py-1 text-xs text-white"
                onClick={() => abrirPendiente(a.conversationId)}
              >
                Abrir chat
              </button>
              <button
                type="button"
                className="rounded-lg bg-black/40 px-3 py-1 text-xs"
                onClick={() => cerrarToast(a.conversationId)}
              >
                Cerrar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
