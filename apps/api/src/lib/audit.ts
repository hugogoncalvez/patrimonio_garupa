function serializar(value: unknown) {
  return value === undefined || value === null
    ? undefined
    : JSON.parse(JSON.stringify(value));
}

export async function registrarAuditoria(
  tx: any,
  data: {
    usuarioId?: number | null;
    accion: "CREAR" | "ACTUALIZAR" | "ELIMINAR" | "LOGIN" | "IMPRIMIR" | "ANULAR";
    entidad: string;
    entidadId?: number | null;
    datosAnteriores?: unknown;
    datosNuevos?: unknown;
    ip?: string | null;
  },
) {
  await tx.auditoria.create({
    data: {
      usuarioId: data.usuarioId ?? null,
      accion: data.accion,
      entidad: data.entidad,
      entidadId: data.entidadId ?? null,
      datosAnteriores: serializar(data.datosAnteriores),
      datosNuevos: serializar(data.datosNuevos),
      ip: data.ip ?? null,
    },
  });
}
