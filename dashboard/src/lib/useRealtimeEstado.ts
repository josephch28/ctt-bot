import { useCallback, useEffect, useRef, useState } from "react";
import { beep } from "./beep.ts";
import {
  activarNotificaciones,
  mostrarNotificacion,
  permisoNotificaciones,
  type AvisoOperador,
} from "./notificar.ts";
import { supabase } from "./supabase.ts";
import type { Conversacion } from "./types.ts";

const tituloBase = "Colmena · CTT FISEI-UTA";

export function useRealtimeEstado(onAbrir: (id: string) => void) {
  const [conectado, setConectado] = useState(false);
  const [pendientes, setPendientes] = useState<AvisoOperador[]>([]);
  const [toasts, setToasts] = useState<AvisoOperador[]>([]);
  const [permiso, setPermiso] = useState(() => permisoNotificaciones());
  const prev = useRef<Map<string, Conversacion>>(new Map());
  const abrirRef = useRef(onAbrir);
  abrirRef.current = onAbrir;

  const abrir = useCallback((id: string) => {
    abrirRef.current(id);
    setPendientes((p) => p.filter((a) => a.conversationId !== id));
    setToasts((t) => t.filter((a) => a.conversationId !== id));
  }, []);
  const abrirFn = useRef(abrir);
  abrirFn.current = abrir;

  const cerrarToast = useCallback((id: string) => {
    setToasts((t) => t.filter((a) => a.conversationId !== id));
  }, []);

  const emitir = useCallback((aviso: AvisoOperador) => {
    setPendientes((p) =>
      p.some((a) => a.conversationId === aviso.conversationId)
        ? p.map((a) => (a.conversationId === aviso.conversationId ? aviso : a))
        : [aviso, ...p],
    );
    setToasts((t) => [aviso, ...t.filter((a) => a.conversationId !== aviso.conversationId)].slice(0, 4));
    try {
      beep();
    } catch {
      /* autoplay */
    }
    mostrarNotificacion(aviso, (id) => abrirFn.current(id));
  }, []);

  useEffect(() => {
    let vivo = true;
    void supabase
      .from("conversations")
      .select("*")
      .then(({ data }) => {
        if (!vivo || !data) return;
        const filas = data as Conversacion[];
        prev.current = new Map(filas.map((c) => [c.id, c]));
        setPendientes(
          filas
            .filter((c) => c.estado === "frustrado")
            .map((c) => ({
              conversationId: c.id,
              nombre: c.nombre ?? c.external_id ?? "Lead",
              motivo: "frustrado" as const,
              detalle: c.resumen ?? "Abeja pidió un operador.",
            })),
        );
      });

    const canal = supabase
      .channel("colmena-estado")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          const fila = payload.new as Conversacion | undefined;
          if (!fila?.id) return;
          const antes = prev.current.get(fila.id);
          prev.current.set(fila.id, fila);
          if (fila.estado !== "frustrado") {
            setPendientes((p) => p.filter((a) => a.conversationId !== fila.id));
          }
          const handover = (antes?.handover_count ?? 0) < fila.handover_count;
          const frustra = fila.estado === "frustrado" && antes?.estado !== "frustrado";
          if (!handover && !frustra) return;
          emitir({
            conversationId: fila.id,
            nombre: fila.nombre ?? fila.external_id ?? "Lead",
            motivo: frustra ? "frustrado" : "handover",
            detalle: fila.resumen?.split("\n")[0] ?? "Abeja pidió un operador.",
          });
        },
      )
      .subscribe((status) => {
        setConectado(status === "SUBSCRIBED");
      });

    return () => {
      vivo = false;
      void supabase.removeChannel(canal);
    };
  }, [emitir]);

  useEffect(() => {
    document.title = pendientes.length > 0 ? `(${pendientes.length}) ${tituloBase}` : tituloBase;
  }, [pendientes.length]);

  async function activarAvisos() {
    const p = await activarNotificaciones();
    setPermiso(p);
  }

  return { conectado, pendientes, toasts, permiso, activarAvisos, abrir, cerrarToast };
}
