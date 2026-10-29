import { z } from "zod";

const texto = z.string().nullable();
const entero = z.number().int().nullable();
const decimal = z.number().nullable();

/** Campos de courses + keywords. Ausente = null; nunca inventar. */
export const cursoNormalizadoSchema = z.object({
  nombre: texto,
  descripcion: texto,
  temario: texto,
  requisitos: texto,
  horas: entero,
  modalidad: texto,
  horario: texto,
  fecha_inicio: texto,
  precio: decimal,
  descuentos: z.array(z.string()),
  certificacion: texto,
  cupos: entero,
  docente: texto,
  link_inscripcion: texto,
  publico: texto,
  keywords: z.array(z.string()).min(1).max(10),
  url_origen: z.string().url(),
  activo: z.boolean(),
});

export type CursoNormalizado = z.infer<typeof cursoNormalizadoSchema>;

export const faqSchema = z.object({
  pregunta: z.string(),
  respuesta: z.string(),
});

export const faqsArchivoSchema = z.array(faqSchema);

export const paginaSchema = z.object({
  url: z.string(),
  tipo: z.enum(["catalogo", "curso", "home", "contacto"]),
  titulo: z.string(),
  texto: z.string(),
});

export type Pagina = z.infer<typeof paginaSchema>;
