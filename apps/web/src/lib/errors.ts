import axios from "axios";

type ErrorData = {
  error?: unknown;
  issues?: unknown;
};

function mensajePorEstado(status: number, esLogin: boolean): string {
  if (status === 400) {
    return "Los datos enviados no son válidos. Revisalos e intentá nuevamente.";
  }
  if (status === 401) {
    return esLogin
      ? "Usuario o contraseña incorrectos."
      : "Tu sesión venció. Volvé a iniciar sesión.";
  }
  if (status === 403) {
    return "No tenés permisos para realizar esta acción.";
  }
  if (status === 404) {
    return "No se encontró la información solicitada.";
  }
  if (status === 409) {
    return "La operación entra en conflicto con datos existentes.";
  }
  if (status === 413) {
    return "El archivo o los datos superan el tamaño permitido.";
  }
  if (status === 429) {
    return "Se hicieron demasiados intentos. Esperá un momento e intentá nuevamente.";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "El servidor no está disponible en este momento. Verificá que la API esté funcionando.";
  }
  if (status >= 500) {
    return "Ocurrió un error interno en el servidor. Intentá nuevamente en unos minutos.";
  }
  return "Ocurrió un error inesperado.";
}

export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const esLogin = String(error.config?.url ?? "").includes("/auth/login");
    const data = error.response?.data as ErrorData | string | undefined;

    if (data && typeof data === "object") {
      if (Array.isArray(data.issues)) {
        const mensajes = data.issues
          .map((issue) =>
            issue && typeof issue === "object" && "message" in issue
              ? String((issue as { message: unknown }).message)
              : "",
          )
          .filter(Boolean);

        if (mensajes.length > 0) {
          return mensajes.join(". ");
        }
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
    }

    if (error.code === "ECONNABORTED") {
      return "El servidor tardó demasiado en responder. Intentá nuevamente.";
    }

    if (!error.response) {
      return "No se pudo conectar con el servidor. Verificá que la API esté funcionando.";
    }

    return mensajePorEstado(status ?? 0, esLogin);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

export async function alertaError(error: unknown) {
  const Swal = (await import("sweetalert2")).default;
  await Swal.fire({
    icon: "error",
    title: "No se pudo completar",
    text: mensajeError(error),
    confirmButtonColor: "#0f4c3a",
  });
}

export async function alertaExito(titulo: string, texto?: string) {
  const Swal = (await import("sweetalert2")).default;
  await Swal.fire({
    icon: "success",
    title: titulo,
    text: texto,
    confirmButtonColor: "#0f4c3a",
    timer: 1600,
    showConfirmButton: false,
  });
}

export async function confirmar(titulo: string, texto: string) {
  const Swal = (await import("sweetalert2")).default;
  const result = await Swal.fire({
    icon: "warning",
    title: titulo,
    text: texto,
    showCancelButton: true,
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c62828",
  });
  return result.isConfirmed;
}
