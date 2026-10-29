import { cargarEnv } from "./cargar-env.ts";
import { procesarTurno } from "./pipeline.ts";
import type { ChannelAdapter } from "./channels/types.ts";

async function main(): Promise<void> {
  cargarEnv();
  const replies: string[] = [];
  const adapter: ChannelAdapter = {
    channel: "telegram",
    async send(_id, text) {
      replies.push(text);
      console.log("ABEJA:", text);
    },
    async typing() {},
  };
  await procesarTurno({
    adapter,
    externalId: "smoke-test",
    nombre: "Prueba",
    username: "smoke",
    texto: "Hola, busco un curso virtual de Python para empezar desde cero. ¿Cuánto cuesta para público?",
    tipo: "texto",
  });
  if (replies.length === 0) throw new Error("El bot no respondió");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
