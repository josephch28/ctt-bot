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
    maxRetries: 1,
  });
  return llm;
}

/** Extras Groq: gpt-oss razona por defecto y retrasa el JSON. */
export function extrasCompletions(): Record<string, unknown> {
  const modelo = modeloLlm();
  const base: Record<string, unknown> = { temperature: 0.3 };
  if (/gpt-oss|o1|o3|reasoning/i.test(modelo)) {
    // El razonamiento interno consume max_tokens y corta el JSON.
    base.include_reasoning = false;
  } else {
    base.max_tokens = 700;
  }
  return base;
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

export async function completarJson(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<{ bruto: string; tokens: number }> {
  const cuerpo = {
    model: modeloLlm(),
    messages,
    response_format: { type: "json_object" as const },
    ...extrasCompletions(),
  };
  const res = await clienteLlm().chat.completions.create(
    cuerpo as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
  );
  const bruto = res.choices[0]?.message.content;
  if (!bruto) throw new Error("sin contenido");
  return { bruto, tokens: res.usage?.total_tokens ?? 0 };
}
