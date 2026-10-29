/** Único enlace de matrícula que Abeja puede enviar. */
export const LINK_INSCRIPCION =
  "https://docs.google.com/forms/d/e/1FAIpQLSeWhh69h-nGZYQvWkFIyR1riMYBOc61CC7YmWL49XBo64I3zA/viewform";

export function fijarLinkInscripcion(texto: string): string {
  return texto
    .replace(/(?:https?:\/\/)?(?:www\.)?[^\s)<"']*uta\.edu\.ec[^\s)<"']*/gi, LINK_INSCRIPCION)
    .replace(/https?:\/\/docs\.google\.com\/forms\/[^\s)<"']*/gi, LINK_INSCRIPCION);
}
