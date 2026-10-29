import OpenAI from "openai";

let llm: OpenAI | null = null;
let stt: OpenAI | null = null;

export function clienteLlm(): OpenAI {
  if (llm) return llm;
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("Falta LLM_API_KEY.");
  llm = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://api.x.ai/v1",
    timeout: 20_000,
    maxRetries: 0,
  });
  return llm;
}

export function clienteStt(): OpenAI | null {
  if (stt) return stt;
  const apiKey = process.env.STT_API_KEY;
  const baseURL = process.env.STT_BASE_URL;
  if (!apiKey || !baseURL) return null;
  stt = new OpenAI({ apiKey, baseURL });
  return stt;
}

export function modeloLlm(): string {
  return process.env.LLM_MODEL ?? "grok-4-fast-non-reasoning";
}

export function modeloStt(): string {
  return process.env.STT_MODEL ?? "whisper-large-v3";
}

export function extraerJson(bruto: string): string {
  const t = bruto.trim();
  const cerca = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (cerca?.[1]) return cerca[1].trim();
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i >= 0 && j > i) return t.slice(i, j + 1);
  return t;
}

function dormir(ms: number): Promise<void> {
  return new Promise((ok) => setTimeout(ok, ms));
}

type GroqRes = {
  error?: { message?: string; failed_generation?: string };
  choices?: { message?: { content?: string | null } }[];
  usage?: { total_tokens?: number };
};

async function postChat(cuerpo: Record<string, unknown>): Promise<{ res: Response; raw: GroqRes }> {
  const apiKey = process.env.LLM_API_KEY;
  const base = (process.env.LLM_BASE_URL ?? "https://api.x.ai/v1").replace(/\/$/, "");
  if (!apiKey) throw new Error("Falta LLM_API_KEY.");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cuerpo),
  });
  const raw = (await res.json()) as GroqRes;
  return { res, raw };
}

export async function completarJson(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<{ bruto: string; tokens: number }> {
  const modelo = modeloLlm();
  const oss = /gpt-oss/i.test(modelo);
  const cuerpo: Record<string, unknown> = {
    model: modelo,
    messages,
    temperature: 0.2,
    max_tokens: oss ? 1200 : 500,
  };
  if (oss) cuerpo.include_reasoning = false;
  else cuerpo.response_format = { type: "json_object" };

  const { res, raw } = await postChat(cuerpo);
  if (res.status === 429) {
    const espera = Math.min(Number(res.headers.get("retry-after") ?? "5") * 1000, 8000);
    console.warn(`Groq 429, espera ${espera} ms`);
    await dormir(espera);
    const otra = await postChat(cuerpo);
    if (!otra.res.ok) throw new Error(otra.raw.error?.message ?? "429");
    const texto = otra.raw.choices?.[0]?.message?.content;
    if (!texto) throw new Error("sin contenido");
    return { bruto: extraerJson(texto), tokens: otra.raw.usage?.total_tokens ?? 0 };
  }
  if (!res.ok) {
    console.error("LLM error:", raw.error ?? raw);
    throw new Error(raw.error?.message ?? `LLM HTTP ${res.status}`);
  }
  const texto = raw.choices?.[0]?.message?.content;
  if (!texto) throw new Error("sin contenido");
  return { bruto: extraerJson(texto), tokens: raw.usage?.total_tokens ?? 0 };
}
