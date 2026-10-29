import { cargarEnv } from "./cargar-env.ts";
import { crearBotTelegram } from "./channels/telegram.ts";
import { listarCursosActivos } from "./db.ts";
import { modeloLlm } from "./llm.ts";
import { escucharOperador } from "./operator.ts";
import { cursosVigentes } from "./vigencia.ts";

async function main(): Promise<void> {
  cargarEnv();
  const cursos = await listarCursosActivos();
  const vigentes = cursosVigentes(cursos);
  console.log(
    `Catálogo: ${cursos.length} activos en base, ${vigentes.length} abiertos a inscripción. LLM: ${modeloLlm()}`,
  );
  const bot = crearBotTelegram();
  const me = await bot.api.getMe();
  console.log(`Bot @${me.username} listo (long polling).`);
  escucharOperador(bot);
  const apagar = () => {
    void bot.stop().finally(() => process.exit(0));
  };
  process.once("SIGTERM", apagar);
  process.once("SIGINT", apagar);
  await bot.start({
    onStart: () => {
      console.log("Long polling activo.");
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
