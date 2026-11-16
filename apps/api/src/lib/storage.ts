import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpError } from "./http.js";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "documentos";

export const uploadsDir =
  process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), "uploads");

export function usaSupabaseStorage() {
  return Boolean(supabaseUrl && serviceKey);
}

export async function guardarArchivo(
  buffer: Buffer,
  nombreOriginal: string,
  mimeType?: string,
) {
  const extension = path.extname(nombreOriginal).slice(0, 12).toLowerCase();
  const nombreAlmacenado = `${Date.now()}-${randomUUID()}${extension}`;

  if (usaSupabaseStorage()) {
    const respuesta = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(nombreAlmacenado)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": mimeType || "application/octet-stream",
          "x-upsert": "false",
        },
        body: new Uint8Array(buffer),
      },
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      throw new HttpError(
        502,
        `No se pudo subir el archivo a Supabase Storage${detalle ? `: ${detalle}` : ""}`,
      );
    }

    return {
      archivoUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(nombreAlmacenado)}`,
      nombreAlmacenado,
    };
  }

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, nombreAlmacenado), buffer);

  return {
    archivoUrl: `/uploads/${nombreAlmacenado}`,
    nombreAlmacenado,
  };
}

export async function eliminarArchivo(archivoUrl: string) {
  if (archivoUrl.startsWith("/uploads/")) {
    await unlink(path.join(uploadsDir, path.basename(archivoUrl))).catch(() => {});
    return;
  }

  if (!usaSupabaseStorage()) return;

  const prefijo = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
  if (!archivoUrl.startsWith(prefijo)) return;

  const nombre = decodeURIComponent(archivoUrl.slice(prefijo.length));
  await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(nombre)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}` },
    },
  ).catch(() => {});
}
