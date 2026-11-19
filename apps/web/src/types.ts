export type Rol = "CONTABLE" | "PATRIMONIO";

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
  rol: Rol;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfiguracionEtiqueta {
  version: 1;
  hojaAnchoMm: number;
  hojaAltoMm: number;
  columnas: number;
  filas: number;
  etiquetaAnchoMm: number;
  etiquetaAltoMm: number;
  margenSuperiorMm: number;
  margenIzquierdoMm: number;
  separacionXMm: number;
  separacionYMm: number;
  ajusteXMm: number;
  ajusteYMm: number;
  qrTamanoMm: number;
}

export interface Rubro {
  id: number;
  nombre: string;
  codigoInterno?: string | null;
  codigoCuenta?: string | null;
  codigoCategoria?: number | null;
  activo: boolean;
  _count?: { bienes: number };
}

export interface EstadoBien {
  id: number;
  nombre: string;
  activo: boolean;
  _count?: { bienes: number };
}

export interface Area {
  id: number;
  nombre: string;
  direccion?: string | null;
  activo: boolean;
  responsableId?: number | null;
  responsable?: {
    id: number;
    nombre: string;
    apellido: string;
    dni?: string | null;
  } | null;
  _count?: { bienes: number; personas: number };
}

export interface Persona {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string | null;
  cargo?: string | null;
  activo: boolean;
  areaId?: number | null;
  area?: { id: number; nombre: string } | null;
  _count?: { bienes: number };
}

export interface Bien {
  id: number;
  codigoInventario: string;
  descripcion: string;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  numeroMotor?: string | null;
  patente?: string | null;
  material?: string | null;
  medidas?: string | null;
  color?: string | null;
  rubroId: number;
  estadoId: number;
  areaId?: number | null;
  subresponsableId?: number | null;
  tipoIncorporacion: string;
  fechaAlta: string;
  valorHistorico?: string | number | null;
  observaciones?: string | null;
  activo: boolean;
  fechaBaja?: string | null;
  motivoBaja?: string | null;
  destinoBaja?: string | null;
  numeroOrdenPago?: string | null;
  numeroResolucionBaja?: string | null;
  fechaResolucionBaja?: string | null;
  valorBaja?: string | number | null;
  ejercicioAlta?: number | null;
  rubro?: { id: number; nombre: string; codigoCuenta?: string | null };
  estado?: { id: number; nombre: string };
  area?: {
    id: number;
    nombre: string;
    responsable?: { id: number; nombre: string; apellido: string } | null;
  } | null;
  subresponsable?: { id: number; nombre: string; apellido: string } | null;
  movimientosCustodia?: MovimientoCustodia[];
  movimientosUbicacion?: MovimientoUbicacion[];
  documentos?: Documento[];
  compraDetalle?: CompraDetalle | null;
  actaRecepcion?: { id: number; numero: string; fecha: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MovimientoCustodia {
  id: number;
  tipo: string;
  fecha: string;
  observaciones?: string | null;
  personaOrigen?: { id: number; nombre: string; apellido: string } | null;
  personaDestino?: { id: number; nombre: string; apellido: string } | null;
  usuario?: { id: number; nombre: string; apellido: string } | null;
}

export interface MovimientoUbicacion {
  id: number;
  tipo: string;
  fecha: string;
  motivo?: string | null;
  observaciones?: string | null;
  areaOrigen?: { id: number; nombre: string } | null;
  areaDestino?: { id: number; nombre: string } | null;
  usuario?: { id: number; nombre: string; apellido: string } | null;
}

export interface Documento {
  id: number;
  tipo: string;
  numero?: string | null;
  fecha?: string | null;
  nombreArchivo: string;
  archivoUrl: string;
  mimeType?: string | null;
  tamano?: number | null;
  createdAt: string;
}

export interface CategoriaConsumible {
  id: number;
  nombre: string;
  activo: boolean;
  _count?: { consumibles: number };
}

export interface Consumible {
  id: number;
  nombre: string;
  categoriaId?: number | null;
  categoria?: { id: number; nombre: string; activo?: boolean } | null;
  unidadMedida: string;
  stockActual: string | number;
  stockMinimo: string | number;
  activo: boolean;
  movimientos?: MovimientoStock[];
}

export interface MovimientoStock {
  id: number;
  consumibleId?: number;
  tipo: string;
  cantidad: string | number;
  fecha: string;
  observaciones?: string | null;
  areaDestino?: { id: number; nombre: string } | null;
  usuario?: { id: number; nombre: string; apellido: string } | null;
  entregaId?: number | null;
  entrega?: { id: number; numero: string } | null;
  compraId?: number | null;
  compra?: { id: number; numeroOrdenPago?: string | null } | null;
  nombreConsumibleSnapshot?: string | null;
  unidadMedidaSnapshot?: string | null;
  orden?: number | null;
  consumible?: {
    id: number;
    nombre: string;
    categoria?: { id: number; nombre: string } | null;
    unidadMedida: string;
  } | null;
}

export type EstadoEntrega = "REGISTRADA" | "ANULADA";

export interface EntregaConsumible {
  id: number;
  numero: string;
  fecha: string;
  areaDestinoId: number;
  areaNombreSnapshot: string;
  responsableNombreSnapshot?: string | null;
  firmanteNombre: string;
  firmanteDni: string;
  usuarioId?: number | null;
  usuarioNombreSnapshot?: string | null;
  observaciones?: string | null;
  estado: EstadoEntrega;
  anuladaPorId?: number | null;
  fechaAnulacion?: string | null;
  motivoAnulacion?: string | null;
  createdAt: string;
  areaDestino?: { id: number; nombre: string } | null;
  usuario?: { id: number; nombre: string; apellido: string } | null;
  anuladaPor?: { id: number; nombre: string; apellido: string } | null;
  movimientos: MovimientoStock[];
  _count?: { movimientos: number };
}

export type Organismo = "DE" | "HCD";
export type EstadoCompra = "REGISTRADA" | "RECIBIDA_PARCIAL" | "RECIBIDA";

export interface Proveedor {
  id: number;
  nombre: string;
  cuit?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo?: boolean;
}

export interface CompraComprobante {
  id?: number;
  tipo: string;
  numero?: string | null;
  fecha?: string | null;
}

export interface BienResumen {
  id: number;
  codigoInventario: string;
  descripcion: string;
  estado?: { id: number; nombre: string } | null;
}

export interface CompraDetalle {
  id: number;
  compraId?: number;
  tipo: "INVENTARIABLE" | "CONSUMIBLE";
  rubroId?: number | null;
  rubro?: {
    id: number;
    nombre: string;
    codigoCategoria?: number | null;
    codigoCuenta?: string | null;
  } | null;
  consumibleId?: number | null;
  consumible?: { id: number; nombre: string; unidadMedida: string } | null;
  cantidad: string | number;
  cantidadRecibida: string | number;
  precioUnitario?: string | number | null;
  descripcion?: string | null;
  bienes?: BienResumen[];
  actaDetalles?: ActaRecepcionDetalle[];
  compra?: {
    id: number;
    fecha: string;
    proveedor?: string | null;
    numeroOrdenPago?: string | null;
    comprobantes?: CompraComprobante[];
  } | null;
}

export interface ActaRecepcionDetalle {
  id: number;
  cantidad: string | number;
  compraDetalle?: CompraDetalle | null;
  bienes?: BienResumen[];
}

export interface ActaRecepcion {
  id: number;
  numero: string;
  fecha: string;
  organismo?: Organismo;
  observaciones?: string | null;
  usuario?: { id: number; nombre: string; apellido: string } | null;
  detalles?: ActaRecepcionDetalle[];
}

export interface Compra {
  id: number;
  fecha: string;
  organismo: Organismo;
  numeroOrdenPago?: string | null;
  estado: EstadoCompra;
  proveedor?: string | null;
  proveedorId?: number | null;
  proveedorDatos?: Proveedor | null;
  areaDestinoId?: number | null;
  areaDestino?: { id: number; nombre: string } | null;
  observaciones?: string | null;
  creadoPor?: { id: number; nombre: string; apellido: string } | null;
  comprobantes: CompraComprobante[];
  actasRecepcion: ActaRecepcion[];
  detalles: CompraDetalle[];
  createdAt?: string;
}

export interface DashboardData {
  bienes: {
    total: number;
    activos: number;
    baja: number;
    sinResponsable: number;
    sinUbicacion: number;
  };
  consumibles: {
    total: number;
    activos: number;
    stockBajo: number;
    detalleStockBajo: {
      id: number;
      nombre: string;
      stockActual: string | number;
      stockMinimo: string | number;
      unidadMedida: string;
    }[];
  };
  comprasMes: number;
  bienesPorRubro: { rubroId: number; nombre: string; cantidad: number }[];
  bienesPorEstado: { estadoId: number; nombre: string; cantidad: number }[];
  bienesPorArea: { areaId: number | null; nombre: string; cantidad: number }[];
  movimientosRecientes: {
    id: string;
    categoria: string;
    descripcion: string;
    fecha: string;
    usuario?: { id: number; nombre: string; apellido: string } | null;
  }[];
}

export type AccionAuditoria =
  | "CREAR"
  | "ACTUALIZAR"
  | "ELIMINAR"
  | "LOGIN"
  | "IMPRIMIR"
  | "ANULAR";

export interface AuditoriaItem {
  id: number;
  usuarioId?: number | null;
  usuario?: {
    id: number;
    nombre: string;
    apellido: string;
    usuario: string;
  } | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: number | null;
  ip?: string | null;
  fecha: string;
}

export interface AuditoriaDetalle extends AuditoriaItem {
  datosAnteriores?: unknown;
  datosNuevos?: unknown;
}

export interface AuditoriaListado extends Paginado<AuditoriaItem> {
  entidades: string[];
}

export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReporteBienesPorArea {
  items: (Bien & {
    responsable?: { id: number; nombre: string; apellido: string } | null;
  })[];
  total: number;
  resumen: {
    areaId: number | null;
    area: string;
    responsable: string;
    cantidad: number;
  }[];
}

export interface ReporteBienesPorResponsable {
  items: (Bien & {
    responsable?: { id: number; nombre: string; apellido: string } | null;
  })[];
  total: number;
}

export interface ReporteConsumiblesStock {
  items: Consumible[];
  total: number;
}

export interface ReporteMovimientosStock {
  items: MovimientoStock[];
  total: number;
}

export interface ReporteComprasPeriodo {
  items: (Compra & {
    comprobantes: CompraComprobante[];
    detalles: CompraDetalle[];
  })[];
  total: number;
  totalPeriodo: number;
}
