export type Estado = "interesado" | "dudoso" | "frustrado" | "lead_caliente";
export type Modo = "ai" | "human";

export type Conversacion = {
  id: string;
  channel: string;
  external_id: string | null;
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
  created_at: string;
  updated_at: string;
};

export type Mensaje = {
  id: number;
  conversation_id: string;
  role: "user" | "assistant" | "operator" | "system";
  content: string | null;
  tipo: string;
  delivered: boolean;
  created_at: string;
};

export type Curso = {
  id: string;
  nombre: string | null;
  precio: number | null;
  fecha_inicio: string | null;
  horario: string | null;
  modalidad: string | null;
  activo: boolean | null;
  certificacion: string | null;
};
