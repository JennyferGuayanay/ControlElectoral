import type {
  Cuenta, CuentaNueva, Mesa, MesaAsignada, Parroquia, Recinto, RecintoNuevo, RolGestionado, Vigencia,
} from '../dominio/operacion';

export interface RepositorioOperacion {
  parroquias(): Promise<Parroquia[]>;
  recintos(): Promise<Recinto[]>;
  mesas(recintoId: number): Promise<Mesa[]>;
  agregarRecinto(recinto: RecintoNuevo): Promise<void>;
  cuentas(rol: RolGestionado, recintoId?: number): Promise<Cuenta[]>;
  crearCuenta(cuenta: CuentaNueva): Promise<string>;
  cambiarEstadoCuenta(usuarioId: string, activo: boolean): Promise<void>;
  restablecerClave(usuarioId: string): Promise<string>;
  coordinaciones(recintoId: number): Promise<Vigencia[]>;
  coordinarRecinto(recintoId: number, coordinadorId: string): Promise<void>;
  asignaciones(mesaId: number): Promise<Vigencia[]>;
  veedoresOcupados(recintoId: number): Promise<Set<string>>;
  asignarVeedor(mesaId: number, veedorId: string, asignacionEsperadaId?: number): Promise<void>;
  miMesa(veedorId: string): Promise<MesaAsignada | null>;
}
