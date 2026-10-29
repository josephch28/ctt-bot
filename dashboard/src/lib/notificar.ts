export type AvisoOperador = {
  conversationId: string;
  nombre: string;
  motivo: "frustrado" | "handover";
  detalle: string;
};

export function permisoNotificaciones(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function activarNotificaciones(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export function mostrarNotificacion(aviso: AvisoOperador, alAbrir: (id: string) => void): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const n = new Notification("Colmena · pide operador", {
    body: `${aviso.nombre}: ${aviso.detalle}`,
    tag: aviso.conversationId,
    requireInteraction: true,
  });
  n.onclick = () => {
    window.focus();
    alAbrir(aviso.conversationId);
    n.close();
  };
}
