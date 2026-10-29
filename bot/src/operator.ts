import type { Bot } from "grammy";
import {
  actualizarConversacion,
  conversacionDeMensaje,
  pendientesOperador,
  reclamarMensajeOperador,
  supabase,
} from "./db.ts";

export function escucharOperador(bot: Bot): void {
  void procesarPendientes(bot);

  supabase()
    .channel("operator-outbox")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const fila = payload.new as {
          id: number;
          role?: string;
          delivered?: boolean;
        };
        if (fila.role !== "operator" || fila.delivered !== false) return;
        void entregar(bot, fila.id);
      },
    )
    .subscribe((status) => {
      console.log("Realtime operador:", status);
    });
}

async function procesarPendientes(bot: Bot): Promise<void> {
  const pendientes = await pendientesOperador();
  for (const m of pendientes) {
    await entregar(bot, m.id);
  }
}

async function entregar(bot: Bot, id: number): Promise<void> {
  const reclamado = await reclamarMensajeOperador(id);
  if (!reclamado?.content) return;
  const conv = await conversacionDeMensaje(reclamado.conversation_id);
  await bot.api.sendMessage(conv.external_id, reclamado.content);
  await actualizarConversacion(conv.id, { mode: "human" });
}
