import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function aplicarArchivo(ruta: string): void {
  if (!existsSync(ruta)) return;
  const texto = readFileSync(ruta, "utf8");
  for (const linea of texto.split(/\r?\n/)) {
    const t = linea.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const clave = t.slice(0, i).trim();
    let valor = t.slice(i + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (valor === "") continue;
    if (process.env[clave] === undefined) process.env[clave] = valor;
  }
}

export function cargarEnv(): void {
  const raiz = join(dirname(fileURLToPath(import.meta.url)), "../..");
  aplicarArchivo(join(raiz, ".env"));
  aplicarArchivo(join(raiz, "dashboard/.env.local"));
}
