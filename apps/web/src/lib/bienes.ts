import type { FamiliaBien, SituacionInmueble } from "../types";

export const FAMILIAS_BIEN: { value: FamiliaBien; label: string }[] = [
  { value: "INMUEBLE", label: "Inmueble" },
  { value: "MUEBLE", label: "Mueble y útil" },
  { value: "MAQUINARIA", label: "Máquina, motor o herramienta" },
  { value: "VEHICULO", label: "Vehículo" },
  { value: "MAQUINARIA_VIAL", label: "Máquina vial" },
  { value: "BIBLIOTECA", label: "Biblioteca y colección" },
  { value: "OTRO", label: "Otro" },
];

export const SITUACIONES_INMUEBLE: {
  value: SituacionInmueble;
  label: string;
}[] = [
  { value: "OCUPADO", label: "Ocupado" },
  { value: "DESOCUPADO", label: "Desocupado" },
  { value: "ALQUILADO", label: "Alquilado" },
  { value: "CEDIDO_COMODATO", label: "Cedido / Comodato" },
  { value: "EN_LITIGIO", label: "En litigio" },
  { value: "OTRO", label: "Otro" },
];

export const ESTADOS_INMUEBLE = [
  "En uso",
  "En desuso",
  "En reparación",
  "Dado de baja",
] as const;

export type CampoBien =
  | "marca"
  | "modelo"
  | "numeroSerie"
  | "numeroMotor"
  | "patente"
  | "material"
  | "medidas"
  | "color"
  | "situacionInmueble"
  | "tipoInmueble"
  | "domicilioInmueble"
  | "localidadInmueble"
  | "provinciaInmueble"
  | "codigoPostalInmueble"
  | "partidaInmobiliaria"
  | "nomenclaturaCatastral"
  | "matriculaInmobiliaria"
  | "superficieTerreno"
  | "superficieCubierta"
  | "destinoInmueble"
  | "fechaEscritura"
  | "numeroEscritura"
  | "notaria";

const CAMPOS_GENERICOS: CampoBien[] = [
  "marca",
  "modelo",
  "numeroSerie",
  "numeroMotor",
  "patente",
  "material",
  "medidas",
  "color",
];

export const CAMPOS_INMUEBLE: CampoBien[] = [
  "situacionInmueble",
  "tipoInmueble",
  "domicilioInmueble",
  "localidadInmueble",
  "provinciaInmueble",
  "codigoPostalInmueble",
  "partidaInmobiliaria",
  "nomenclaturaCatastral",
  "matriculaInmobiliaria",
  "superficieTerreno",
  "superficieCubierta",
  "destinoInmueble",
  "fechaEscritura",
  "numeroEscritura",
  "notaria",
];

const CAMPOS_POR_FAMILIA: Record<FamiliaBien, CampoBien[]> = {
  INMUEBLE: CAMPOS_INMUEBLE,
  MUEBLE: ["marca", "modelo", "numeroSerie", "material", "medidas", "color"],
  MAQUINARIA: [
    "marca",
    "modelo",
    "numeroSerie",
    "numeroMotor",
    "material",
    "medidas",
    "color",
  ],
  VEHICULO: [
    "marca",
    "modelo",
    "numeroSerie",
    "numeroMotor",
    "patente",
    "color",
  ],
  MAQUINARIA_VIAL: [
    "marca",
    "modelo",
    "numeroSerie",
    "numeroMotor",
    "patente",
    "material",
    "medidas",
    "color",
  ],
  BIBLIOTECA: ["material", "medidas"],
  OTRO: CAMPOS_GENERICOS,
};

const CAMPOS_OBLIGATORIOS: Record<FamiliaBien, CampoBien[]> = {
  INMUEBLE: [],
  MUEBLE: [],
  MAQUINARIA: ["marca", "modelo", "numeroSerie"],
  VEHICULO: ["marca", "modelo", "numeroSerie", "patente"],
  MAQUINARIA_VIAL: ["marca", "modelo", "numeroSerie", "patente"],
  BIBLIOTECA: [],
  OTRO: [],
};

export const CAMPOS_ESPECIFICOS: CampoBien[] = [
  ...new Set([...CAMPOS_GENERICOS, ...CAMPOS_INMUEBLE]),
];

export function campoVisible(campo: CampoBien, familia: FamiliaBien) {
  return CAMPOS_POR_FAMILIA[familia].includes(campo);
}

export function campoObligatorio(campo: CampoBien, familia: FamiliaBien) {
  return CAMPOS_OBLIGATORIOS[familia].includes(campo);
}

export function estadoVisibleParaFamilia(
  nombre: string,
  familia: FamiliaBien,
) {
  if (familia !== "INMUEBLE") return true;
  return ESTADOS_INMUEBLE.includes(
    nombre as (typeof ESTADOS_INMUEBLE)[number],
  );
}

export function etiquetaFamilia(familia?: FamiliaBien) {
  return FAMILIAS_BIEN.find((opcion) => opcion.value === familia)?.label ?? "-";
}

export function etiquetaSituacion(situacion?: SituacionInmueble | null) {
  return (
    SITUACIONES_INMUEBLE.find((opcion) => opcion.value === situacion)?.label ??
    "-"
  );
}

const ETIQUETAS_CAMPOS: Record<CampoBien, string> = {
  marca: "Marca",
  modelo: "Modelo",
  numeroSerie: "N° de serie",
  numeroMotor: "N° de motor",
  patente: "Patente",
  material: "Material",
  medidas: "Medidas",
  color: "Color",
  situacionInmueble: "Situación del inmueble",
  tipoInmueble: "Tipo de inmueble",
  domicilioInmueble: "Domicilio",
  localidadInmueble: "Localidad",
  provinciaInmueble: "Provincia",
  codigoPostalInmueble: "Código postal",
  partidaInmobiliaria: "Partida inmobiliaria",
  nomenclaturaCatastral: "Nomenclatura catastral",
  matriculaInmobiliaria: "Matrícula",
  superficieTerreno: "Superficie del terreno",
  superficieCubierta: "Superficie cubierta",
  destinoInmueble: "Destino",
  fechaEscritura: "Fecha de escritura",
  numeroEscritura: "N° de escritura",
  notaria: "Notaría",
};

export function etiquetaCampo(campo: CampoBien) {
  return ETIQUETAS_CAMPOS[campo];
}
