import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Estado =
  | "interesado"
  | "dudoso"
  | "frustrado"
  | "lead_caliente";

export type Modo = "ai" | "human";

export type Curso = {
  id: string;
  nombre: string | null;
  descripcion: string | null;
  temario: string | null;
  requisitos: string | null;
  horas: number | null;
  modalidad: string | null;
  horario: string | null;
  fecha_inicio: string | null;
  precio: number | null;
  descuentos: unknown;
  certificacion: string | null;
  cupos: number | null;
  docente: string | null;
  link_inscripcion: string | null;
  publico: string | null;
  keywords: string[] | null;
  url_origen: string | null;
  activo: boolean | null;
};

export type Conversacion = {
  id: string;
  channel: string;
  external_id: string;
  nombre: string | null;
  username: string | null;
  mode: Modo;
  estado: Estado;
  intencion: string | null;
  perfil: Record<string, unknown> | null;
  resumen: string | null;
  curso_interes: string | null;
  alerta_seguridad: boolean;
  handover_count: number;
  tokens_usados: number;
  mensajes_desde_resumen: number;
};

export type Mensaje = {
  id: number;
  conversation_id: string;
  role: "user" | "assistant" | "operator" | "system";
  content: string | null;
  tipo: "texto" | "voz";
  delivered: boolean;
};

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Falta URL o clave de Supabase.");
  cliente = createClient(url, key, { auth: { persistSession: false } });
  return cliente;
}

export async function upsertConversacion(input: {
  channel: string;
  externalId: string;
  nombre: string | null;
  username: string | null;
}): Promise<Conversacion> {
  const { data, error } = await supabase()
    .from("conversations")
    .upsert(
      {
        channel: input.channel,
        external_id: input.externalId,
        nombre: input.nombre,
        username: input.username,
      },
      { onConflict: "channel,external_id" },
    )
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "upsert conversación");
  return data as Conversacion;
}

export async function leerConversacion(id: string): Promise<Conversacion> {
  const { data, error } = await supabase()
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "leer conversación");
  return data as Conversacion;
}

export async function guardarMensaje(input: {
  conversationId: string;
  role: Mensaje["role"];
  content: string;
  tipo?: "texto" | "voz";
  delivered?: boolean;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase().from("messages").insert({
    conversation_id: input.conversationId,
    role: input.role,
    content: input.content,
    tipo: input.tipo ?? "texto",
    delivered: input.delivered ?? true,
    meta: input.meta ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function ultimosMensajes(
  conversationId: string,
  limite: number,
): Promise<Mensaje[]> {
  const { data, error } = await supabase()
    .from("messages")
    .select("id, conversation_id, role, content, tipo, delivered")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return ([...(data ?? [])] as Mensaje[]).reverse();
}

export async function actualizarConversacion(
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase().from("conversations").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarCursosActivos(): Promise<Curso[]> {
  const { data, error } = await supabase()
    .from("courses")
    .select("*")
    .eq("activo", true);
  if (error) throw new Error(error.message);
  return (data ?? []) as Curso[];
}

export async function listarFaqs(): Promise<{ pregunta: string; respuesta: string }[]> {
  const { data, error } = await supabase().from("faqs").select("pregunta, respuesta");
  if (error) throw new Error(error.message);
  return (data ?? []) as { pregunta: string; respuesta: string }[];
}

export async function reclamarMensajeOperador(id: number): Promise<Mensaje | null> {
  const { data, error } = await supabase()
    .from("messages")
    .update({ delivered: true })
    .eq("id", id)
    .eq("delivered", false)
    .eq("role", "operator")
    .select("id, conversation_id, role, content, tipo, delivered")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Mensaje | null) ?? null;
}

export async function pendientesOperador(): Promise<Mensaje[]> {
  const { data, error } = await supabase()
    .from("messages")
    .select("id, conversation_id, role, content, tipo, delivered")
    .eq("role", "operator")
    .eq("delivered", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Mensaje[];
}

export async function conversacionDeMensaje(
  conversationId: string,
): Promise<Conversacion> {
  return leerConversacion(conversationId);
}
