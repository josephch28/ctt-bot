import { useEffect, useRef, useState } from "react";
import { beep } from "./beep.ts";
import { supabase } from "./supabase.ts";
import type { Conversacion } from "./types.ts";

const tituloBase = "Colmena · CTT FISEI-UTA";

export function useRealtimeEstado() {
  const [conectado, setConectado] = useState(false);
  const [alertas, setAlertas] = useState(0);
  const prev = useRef<Map<string, Conversacion>>(new Map());

  useEffect(() => {
    let vivo = true;
    void supabase
      .from("conversations")
      .select("*")
      .then(({ data }) => {
        if (!vivo || !data) return;
        prev.current = new Map((data as Conversacion[]).map((c) => [c.id, c]));
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
          const calienta =
            fila.estado === "lead_caliente" || fila.estado === "frustrado";
          const era =
            antes &&
            (antes.estado === "lead_caliente" || antes.estado === "frustrado");
          if (calienta && !era) {
            setAlertas((n) => n + 1);
            try {
              beep();
            } catch {
              /* autoplay */
            }
          }
        },
      )
      .subscribe((status) => {
        setConectado(status === "SUBSCRIBED");
      });

    return () => {
      vivo = false;
      void supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    document.title = alertas > 0 ? `(${alertas}) ${tituloBase}` : tituloBase;
  }, [alertas]);

  return { conectado, alertas };
}
