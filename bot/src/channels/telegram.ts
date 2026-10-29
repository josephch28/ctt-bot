import { Bot } from "grammy";
import type { ChannelAdapter } from "./types.ts";
import { actualizarConversacion, upsertConversacion } from "../db.ts";
import { aHtmlTelegram, escaparHtml, planoSinMarcas } from "../formato.ts";
import { procesarTurno } from "../pipeline.ts";
import { sttConfigurado, transcribirAudio } from "../voice.ts";

export function crearBotTelegram(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN.");
  const bot = new Bot(token);
  const adapter = adaptadorTelegram(bot);

  bot.catch((err) => {
    console.error("Error en Telegram:", err.error ?? err);
  });

  bot.command("start", async (ctx) => {
    const conv = await upsertConversacion({
      channel: "telegram",
      externalId: String(ctx.chat.id),
      nombre: ctx.from?.first_name ?? null,
      username: ctx.from?.username ?? null,
    });
    await actualizarConversacion(conv.id, { mode: "ai" });
    const nombre = ctx.from?.first_name ?? "tú";
    await ctx.reply(
      [
        `Hola ${escaparHtml(nombre)}, soy <b>Abeja</b> del CTT de la FISEI-UTA.`,
        "",
        "Te ayudo con las convocatorias que siguen abiertas:",
        "• catálogo, precios y fechas oficiales",
        "• requisitos, horarios y certificación",
        "• enlace de inscripción cuando exista",
        "",
        "¿Qué te gustaría aprender?",
      ].join("\n"),
      { parse_mode: "HTML" },
    );
  });

  bot.on("message:text", async (ctx) => {
    const texto = ctx.message.text;
    if (!texto || texto.startsWith("/")) return;
    await procesarTurno({
      adapter,
      externalId: String(ctx.chat.id),
      nombre: ctx.from?.first_name ?? null,
      username: ctx.from?.username ?? null,
      texto,
      tipo: "texto",
    });
  });

  bot.on("message:voice", async (ctx) => {
    if (!sttConfigurado()) {
      await ctx.reply("Ahora mismo no puedo oír notas de voz. ¿Me escribes el mensaje en texto?");
      return;
    }
    try {
      const file = await ctx.getFile();
      if (!file.file_path) throw new Error("sin file_path");
      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const texto = await transcribirAudio(buf, "voz.ogg");
      if (!texto) {
        await ctx.reply("No alcancé a entender el audio. ¿Lo escribes en texto?");
        return;
      }
      await procesarTurno({
        adapter,
        externalId: String(ctx.chat.id),
        nombre: ctx.from?.first_name ?? null,
        username: ctx.from?.username ?? null,
        texto,
        tipo: "voz",
      });
    } catch (err) {
      console.error(err);
      await ctx.reply("No pude transcribir el audio. ¿Lo intentamos por texto?");
    }
  });

  return bot;
}

export function adaptadorTelegram(bot: Bot): ChannelAdapter {
  return {
    channel: "telegram",
    async send(externalId, text) {
      const html = aHtmlTelegram(text);
      try {
        await bot.api.sendMessage(externalId, html, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
      } catch (err) {
        console.error("HTML de Telegram rechazado, envío plano:", err);
        await bot.api.sendMessage(externalId, planoSinMarcas(text), {
          link_preview_options: { is_disabled: true },
        });
      }
    },
    async typing(externalId) {
      await bot.api.sendChatAction(externalId, "typing");
    },
  };
}
