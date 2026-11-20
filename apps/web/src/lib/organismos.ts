import type { Organismo } from "../types";

export const ORGANISMOS: { value: Organismo; label: string }[] = [
  { value: "DE", label: "Departamento Ejecutivo" },
  { value: "HCD", label: "Honorable Concejo Deliberante" },
];

export function etiquetaOrganismo(organismo?: Organismo | null) {
  return ORGANISMOS.find((opcion) => opcion.value === organismo)?.label ?? "-";
}
