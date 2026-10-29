import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { colorEstado, etiquetaEstado, ordenarConversaciones } from "../lib/urgencia.ts";
import type { Conversacion, Curso, Mensaje } from "../lib/types.ts";

export function Conversaciones({ abrirId }: { abrirId: string | null }) {
  const [lista, setLista] = useState<Conversacion[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [ultimos, setUltimos] = useState<Record<string, string>>({});
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const fondo = useRef<HTMLDivElement>(null);
  const selRef = useRef<string | null>(null);
  selRef.current = sel;

  useEffect(() => {
    void cargar();
    const canal = supabase
      .channel("colmena-chat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          const fila = payload.new as Conversacion;
          if (!fila?.id) return;
          setLista((prev) => {
            const resto = prev.filter((c) => c.id !== fila.id);
            return ordenarConversaciones([...resto, fila]);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Mensaje;
          if (!m?.id) return;
          setUltimos((u) => ({ ...u, [m.conversation_id]: m.content ?? "" }));
          setMensajes((prev) => {
            if (m.conversation_id !== selRef.current) return prev;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    if (abrirId) setSel(abrirId);
  }, [abrirId]);

  useEffect(() => {
    if (!sel) return;
    void supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", sel)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMensajes((data as Mensaje[]) ?? []));
  }, [sel]);

  useEffect(() => {
    fondo.current?.scrollTo({ top: fondo.current.scrollHeight });
  }, [mensajes, sel]);

  const activa = lista.find((c) => c.id === sel) ?? null;
  const curso = useMemo(
    () => cursos.find((c) => c.id === activa?.curso_interes) ?? null,
    [cursos, activa],
  );
  const hilo = mensajes.filter((m) => m.conversation_id === sel);

  async function cargar() {
    const [{ data: convs }, { data: msgs }, { data: cats }] = await Promise.all([
      supabase.from("conversations").select("*"),
      supabase.from("messages").select("conversation_id, content, created_at").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, nombre, precio, fecha_inicio, horario, modalidad, activo, certificacion"),
    ]);
    setLista(ordenarConversaciones((convs as Conversacion[]) ?? []));
    const map: Record<string, string> = {};
    for (const m of (msgs as { conversation_id: string; content: string | null }[]) ?? []) {
      if (map[m.conversation_id] == null) map[m.conversation_id] = m.content ?? "";
    }
    setUltimos(map);
    setCursos((cats as Curso[]) ?? []);
  }

  async function tomarControl() {
    if (!activa) return;
    await supabase.from("conversations").update({ mode: "human" }).eq("id", activa.id);
    await supabase.from("messages").insert({
      conversation_id: activa.id,
      role: "system",
      content: "Un operador tomó el control de la conversación.",
      delivered: true,
    });
  }

  async function devolverIa() {
    if (!activa) return;
    await supabase.from("conversations").update({ mode: "ai" }).eq("id", activa.id);
    await supabase.from("messages").insert({
      conversation_id: activa.id,
      role: "system",
      content: "La conversación volvió a la IA (Abeja).",
      delivered: true,
    });
  }

  async function enviar() {
    if (!activa || !texto.trim()) return;
    const body = texto.trim();
    setTexto("");
    await supabase.from("conversations").update({ mode: "human" }).eq("id", activa.id);
    await supabase.from("messages").insert({
      conversation_id: activa.id,
      role: "operator",
      content: body,
      delivered: false,
    });
  }

  return (
    <div className="grid h-[calc(100vh-5.5rem)] grid-cols-1 gap-3 lg:grid-cols-[280px_1fr_280px]">
      <aside className="overflow-y-auto rounded-xl border border-amber-900/50 bg-[#1c140c]">
        {lista.length === 0 ? (
          <p className="p-4 text-sm text-amber-500">Aún no hay conversaciones.</p>
        ) : (
          lista.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSel(c.id)}
              className={`flex w-full flex-col gap-1 border-b border-amber-900/40 px-3 py-2 text-left ${
                sel === c.id ? "bg-amber-900/40" : "hover:bg-amber-950/40"
              } ${c.estado === "frustrado" ? "ring-1 ring-inset ring-red-600" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="dot-vivo h-2.5 w-2.5 rounded-full"
                  style={{ background: colorEstado[c.estado] }}
                />
                <span className="truncate font-medium">{c.nombre ?? c.external_id ?? "Lead"}</span>
                {c.alerta_seguridad ? <span title="Alerta">🛡️</span> : null}
              </div>
              <div className="flex flex-wrap gap-1 text-[11px]">
                <span className="rounded-full bg-black/40 px-2 py-0.5">{etiquetaEstado[c.estado]}</span>
                <span className="rounded-full bg-black/40 px-2 py-0.5">
                  {c.mode === "human" ? "Humano" : "IA"}
                </span>
                {c.estado === "frustrado" ? (
                  <span className="rounded-full bg-red-700 px-2 py-0.5 text-white">Pide operador</span>
                ) : null}
              </div>
              <p className="truncate text-xs text-amber-500/90">{ultimos[c.id] ?? "—"}</p>
            </button>
          ))
        )}
      </aside>

      <section className="flex flex-col rounded-xl border border-amber-900/50 bg-[#1c140c]">
        <div ref={fondo} className="flex-1 space-y-2 overflow-y-auto p-4">
          {!activa ? (
            <p className="text-sm text-amber-500">Elige un hilo a la izquierda.</p>
          ) : (
            hilo.map((m) => <Burbuja key={m.id} m={m} />)
          )}
        </div>
        {activa ? (
          <form
            className="flex gap-2 border-t border-amber-900/50 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <button type="button" className="rounded-lg bg-orange-700 px-3 py-2 text-xs" onClick={() => void tomarControl()}>
              Tomar control
            </button>
            <button type="button" className="rounded-lg bg-emerald-800 px-3 py-2 text-xs" onClick={() => void devolverIa()}>
              Devolver a la IA
            </button>
            <input
              className="flex-1 rounded-lg border border-amber-800 bg-black/30 px-3 py-2 text-sm outline-none"
              placeholder="Escribe como operador…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-stone-900">
              Enviar
            </button>
          </form>
        ) : null}
      </section>

      <aside className="overflow-y-auto rounded-xl border border-amber-900/50 bg-[#1c140c] p-4 text-sm">
        {!activa ? (
          <p className="text-amber-500">Ficha del lead</p>
        ) : (
          <>
            <h2 className="mb-2 font-semibold text-amber-200">Resumen</h2>
            <p className="whitespace-pre-wrap text-amber-100/90">{activa.resumen ?? "Sin resumen aún."}</p>
            <h2 className="mt-4 mb-2 font-semibold text-amber-200">Lead</h2>
            <p>Nombre: {activa.nombre ?? "—"}</p>
            <p>Usuario: @{activa.username ?? "—"}</p>
            <p>Canal: {activa.channel}</p>
            <p>Intención: {activa.intencion ?? "—"}</p>
            <p>Perfil: {activa.perfil ? JSON.stringify(activa.perfil) : "—"}</p>
            <h2 className="mt-4 mb-2 font-semibold text-amber-200">Curso de interés</h2>
            <p>{curso?.nombre ?? "Ninguno"}</p>
            <h2 className="mt-4 mb-2 font-semibold text-amber-200">Uso</h2>
            <p>Tokens: {activa.tokens_usados}</p>
            <p>Traslados: {activa.handover_count}</p>
          </>
        )}
      </aside>
    </div>
  );
}

function Burbuja({ m }: { m: Mensaje }) {
  if (m.role === "system") {
    return (
      <p className="text-center text-xs italic text-amber-500">{m.content}</p>
    );
  }
  const lado = m.role === "user" ? "items-start" : "items-end";
  const color =
    m.role === "user"
      ? "bg-stone-800"
      : m.role === "operator"
        ? "bg-amber-700 text-stone-900"
        : "bg-amber-900/70";
  return (
    <div className={`flex flex-col ${lado}`}>
      <span className="text-[10px] uppercase tracking-wide text-amber-600">{m.role}</span>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${color}`}>{m.content}</div>
    </div>
  );
}
