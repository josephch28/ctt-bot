import { aHtmlTelegram, planoSinMarcas } from "./formato.ts";

function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const muestra = [
  "¡Hola!",
  "• *Fundamentos de Python 1 – Certified Entry-Level Python*",
  "• Público: USD 60",
  "• Descuentos: Estudiantes UTA: $40,00",
  "• Inscripción: https://docs.google.com/forms/d/e/1FAIpQLSeWhh69h-nGZYQvWkFIyR1riMYBOc61CC7YmWL49XBo64I3zA/viewform",
  "¿Le gustaría el enlace?",
].join("\n");

const html = aHtmlTelegram(muestra);
ok(html.includes("<b>Fundamentos de Python 1"), "nombre en negrita");
ok(!html.includes("*Fundamentos"), "sin asteriscos sueltos");
ok(html.includes("Formulario de inscripción"), "enlace con etiqueta");
ok(html.includes("<a href=\"https://docs.google.com"), "href del form");
ok(html.includes("USD 60"), "precio intacto");
ok(html.includes("$40,00") || html.includes("$40,00"), "descuento intacto");

const dobles = aHtmlTelegram("Mira **Linux Essentials** hoy");
ok(dobles.includes("<b>Linux Essentials</b>"), "doble asterisco");

ok(planoSinMarcas("• *Python*").includes("Python"), "plano sin marcas");
ok(!planoSinMarcas("• *Python*").includes("*"), "plano sin *");

console.log("formato.test.ts ok");
