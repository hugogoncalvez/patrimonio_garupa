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

export interface Rubro {
  id: number;
  nombre: string;
  codigoInterno?: string | null;
  codigoCuenta?: string | null;
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
  numeroIdentificacion: string;
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
  area?: { id: number; nombre: string } | null;
  subresponsable?: { id: number; nombre: string; apellido: string } | null;
  movimientosCustodia?: MovimientoCustodia[];
  movimientosUbicacion?: MovimientoUbicacion[];
  documentos?: Documento[];
  compraDetalles?: CompraDetalle[];
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

export interface CompraDetalle {
  id: number;
  compraId?: number;
  compra?: {
    id: number;
    proveedor?: string | null;
    fecha: string;
  } | null;
  cantidad: string | number;
  precioUnitario?: string | number | null;
  descripcion?: string | null;
  bienId?: number | null;
  consumibleId?: number | null;
  bien?: {
    id: number;
    codigoInventario: string;
    numeroIdentificacion: string;
    descripcion: string;
  } | null;
  consumible?: { id: number; nombre: string; unidadMedida: string } | null;
}

export interface Compra {
  id: number;
  fecha: string;
  proveedor?: string | null;
  tipoComprobante?: string | null;
  numeroComprobante?: string | null;
  numeroExpediente?: string | null;
  observaciones?: string | null;
  creadoPor?: { id: number; nombre: string; apellido: string } | null;
  detalles: CompraDetalle[];
  createdAt?: string;
}

export interface DashboardData {
  bienes: { total: number; activos: number; baja: number };
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
  movimientosRecientes: {
    id: string;
    categoria: string;
    descripcion: string;
    fecha: string;
    usuario?: { id: number; nombre: string; apellido: string } | null;
  }[];
}

export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
