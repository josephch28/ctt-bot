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
