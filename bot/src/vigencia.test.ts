import type { Curso } from "./db.ts";
import { cursoInscribible, extraerRangoFechas } from "./vigencia.ts";

const ahora = new Date(2026, 9, 29); // 29 oct 2026

function base(parcial: Partial<Curso>): Curso {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    nombre: "x",
    descripcion: null,
    temario: null,
    requisitos: null,
    horas: null,
    modalidad: "Virtual autodidacta",
    horario: null,
    fecha_inicio: null,
    precio: 60,
    descuentos: null,
    certificacion: null,
    cupos: null,
    docente: null,
    link_inscripcion: null,
    publico: null,
    keywords: null,
    url_origen: null,
    activo: true,
    ...parcial,
  };
}

function ok(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const r1 = extraerRangoFechas("Del 01 de marzo al 30 de marzo de 2025");
ok(r1.inicio?.toISOString().startsWith("2025-03-01") === true, "inicio marzo 2025");
ok(r1.fin?.toISOString().startsWith("2025-03-30") === true, "fin marzo 2025");

const r2 = extraerRangoFechas("5-abril a 18-mayo-2025");
ok(r2.inicio?.toISOString().startsWith("2025-04-05") === true, "inicio abril corto");
ok(r2.fin?.toISOString().startsWith("2025-05-18") === true, "fin mayo corto");

ok(
  !cursoInscribible(
    base({
      nombre: "PYTHON 1 2025",
      modalidad: "Virtual autodidacta",
      fecha_inicio: "Del 01 de marzo al 30 de marzo de 2025",
    }),
    ahora,
  ),
  "edición 2025 autodidacta vencida",
);

ok(
  !cursoInscribible(
    base({
      nombre: "CCNA",
      modalidad: "Híbrida (presencial y virtual)",
      fecha_inicio: "Del 16 de octubre de 2026 al 05 de diciembre de 2026",
    }),
    ahora,
  ),
  "híbrida ya empezó: no inscribible",
);

ok(
  cursoInscribible(
    base({
      nombre: "PYTHON 1 2026",
      modalidad: "Virtual autodidacta",
      fecha_inicio: "Del 16 de octubre de 2026 al 16 de noviembre de 2026",
    }),
    ahora,
  ),
  "autodidacta 2026 aún no cierra",
);

ok(
  cursoInscribible(
    base({
      nombre: "GH-600",
      modalidad: "Virtual",
      fecha_inicio: "Del 14 de noviembre de 2026 al 05 de diciembre de 2026",
    }),
    ahora,
  ),
  "virtual con clases futuras",
);

ok(
  cursoInscribible(
    base({
      nombre: "Arduino",
      modalidad: "Presencial",
      fecha_inicio: "Del 14 de noviembre de 2026 al 05 de diciembre de 2026",
    }),
    ahora,
  ),
  "presencial futura",
);

console.log("vigencia.test.ts ok");
