export type Rol = "CONTABLE" | "PATRIMONIO";

export interface UsuarioToken {
  id: number;
  usuario: string;
  rol: Rol;
  nombre: string;
  apellido: string;
}
