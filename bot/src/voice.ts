import { toFile } from "openai";
import { clienteStt, modeloStt } from "./llm.ts";

export function sttConfigurado(): boolean {
  return Boolean(process.env.STT_API_KEY && process.env.STT_BASE_URL);
}

export async function transcribirAudio(
  bytes: Buffer,
  nombre: string,
): Promise<string> {
  const client = clienteStt();
  if (!client) throw new Error("STT no configurado");
  const file = await toFile(bytes, nombre);
  const res = await client.audio.transcriptions.create({
    file,
    model: modeloStt(),
    language: "es",
  });
  return res.text.trim();
}
