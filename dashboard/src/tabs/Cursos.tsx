import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import type { Curso } from "../lib/types.ts";

export function Cursos() {
  const [filas, setFilas] = useState<Curso[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar() {
    const { data, error } = await supabase
      .from("courses")
      .select("id, nombre, precio, fecha_inicio, horario, modalidad, activo, certificacion")
      .order("nombre");
    if (error) {
      setAviso(error.message);
      return;
    }
    setFilas((data as Curso[]) ?? []);
  }

  async function guardar(c: Curso) {
    const { error } = await supabase
      .from("courses")
      .update({
        precio: c.precio,
        fecha_inicio: c.fecha_inicio,
        horario: c.horario,
        modalidad: c.modalidad,
        activo: c.activo,
      })
      .eq("id", c.id);
    setAviso(error ? error.message : "Guardado");
  }

  function patch(id: string, cambio: Partial<Curso>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...cambio } : f)));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-amber-900/50 bg-[#1c140c] p-3">
      {aviso ? <p className="mb-2 text-sm text-amber-300">{aviso}</p> : null}
      <table className="min-w-full text-left text-sm">
        <thead className="text-amber-400">
          <tr>
            <th className="p-2">Curso</th>
            <th className="p-2">Precio</th>
            <th className="p-2">Fecha</th>
            <th className="p-2">Horario</th>
            <th className="p-2">Modalidad</th>
            <th className="p-2">Activo</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => (
            <tr key={c.id} className="border-t border-amber-900/40">
              <td className="p-2 max-w-xs">{c.nombre}</td>
              <td className="p-2">
                <input
                  className="w-20 rounded bg-black/40 px-2 py-1"
                  type="number"
                  value={c.precio ?? ""}
                  onChange={(e) =>
                    patch(c.id, { precio: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </td>
              <td className="p-2">
                <input
                  className="w-56 rounded bg-black/40 px-2 py-1"
                  value={c.fecha_inicio ?? ""}
                  onChange={(e) => patch(c.id, { fecha_inicio: e.target.value })}
                />
              </td>
              <td className="p-2">
                <input
                  className="w-48 rounded bg-black/40 px-2 py-1"
                  value={c.horario ?? ""}
                  onChange={(e) => patch(c.id, { horario: e.target.value })}
                />
              </td>
              <td className="p-2">
                <input
                  className="w-40 rounded bg-black/40 px-2 py-1"
                  value={c.modalidad ?? ""}
                  onChange={(e) => patch(c.id, { modalidad: e.target.value })}
                />
              </td>
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={Boolean(c.activo)}
                  onChange={(e) => patch(c.id, { activo: e.target.checked })}
                />
              </td>
              <td className="p-2">
                <button
                  type="button"
                  className="rounded bg-amber-500 px-3 py-1 text-stone-900"
                  onClick={() => void guardar(c)}
                >
                  Guardar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
