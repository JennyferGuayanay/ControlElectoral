import { z } from 'zod';

const id = z.number().int().positive();
const nombre = (etiqueta: string) => z.string().trim().min(1, `Escribe ${etiqueta}.`).max(120, 'Usa hasta 120 caracteres.');

export const esquemaRecintoNuevo = z.object({
  parroquiaId: id.nullable().refine((valor) => valor !== null, 'Selecciona una parroquia.'),
  nombre: nombre('el nombre del recinto'),
  zona: z.string().trim().max(80, 'Usa hasta 80 caracteres.'),
  direccion: z.string().trim().max(250, 'Usa hasta 250 caracteres.'),
});

export function cedulaValida(cedula: string) {
  if (!/^(0[1-9]|1[0-9]|2[0-4]|30)[0-5][0-9]{7}$/.test(cedula)) return false;
  const suma = [...cedula.slice(0, 9)].reduce((total, cifra, posicion) => {
    const digito = Number(cifra) * (posicion % 2 === 0 ? 2 : 1);
    return total + (digito > 9 ? digito - 9 : digito);
  }, 0);
  return ((10 - suma % 10) % 10) === Number(cedula[9]);
}

export type RolGestionado = 'recinto' | 'veedor';

export const esquemaCuentaNueva = z.object({
  cedula: z.string().trim().refine(cedulaValida, 'Escribe una cédula ecuatoriana válida.'),
  nombres: nombre('los nombres'),
  apellidos: nombre('los apellidos'),
  telefono: z.string().trim().regex(/^\+?\d{7,15}$/, 'Escribe de 7 a 15 dígitos. Puedes incluir «+» al inicio.'),
  correo: z.string().trim().toLowerCase().max(254, 'Usa hasta 254 caracteres.').pipe(z.email('Escribe un correo válido.')),
  recintoId: id.nullable(),
});

export type RecintoNuevo = z.infer<typeof esquemaRecintoNuevo> & { parroquiaId: number };
export type CuentaNueva = Omit<z.infer<typeof esquemaCuentaNueva>, 'recintoId'> & (
  { rol: 'recinto'; recintoId: null } | { rol: 'veedor'; recintoId: number }
);

export type NombrePersona = { nombres: string; apellidos: string };
export type Parroquia = { id: number; nombre: string; canton: { nombre: string } | null };
export type Recinto = { id: number; nombre: string; direccion: string | null; zona: string; parroquia_id: number };
export type Mesa = { id: number; numero: number; numero_jrv_cne: number | null; sexo: 'F' | 'M' | 'X'; es_simulacion: boolean };
export type Cuenta = NombrePersona & {
  usuario_id: string; activo: boolean; correo: string; rol_codigo: RolGestionado;
  recinto_base_id: number | null; cambio_clave_pendiente: boolean; correo_verificado_en: string | null;
};
export type Vigencia = {
  id: number; desde: string; hasta: string | null; responsable_id: string; responsable: NombrePersona | null;
};
export type MesaAsignada = {
  desde: string;
  mesa: (Mesa & { recinto: (Recinto & { parroquia: Parroquia | null }) | null }) | null;
};

export function nombreCompleto(persona: NombrePersona) {
  return `${persona.nombres} ${persona.apellidos}`;
}

export function rotuloMesa(mesa: Mesa) {
  const nombreMesa = mesa.numero_jrv_cne === null ? `Mesa interna ${mesa.numero}` : `JRV ${mesa.numero_jrv_cne}`;
  return `${nombreMesa} · ${{ F: 'Femenina', M: 'Masculina', X: 'Mixta' }[mesa.sexo]}`;
}

export function coincideBusqueda(consulta: string, ...campos: (string | null | undefined)[]) {
  const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const texto = normalizar(campos.join(' '));
  return normalizar(consulta.trim()).split(/\s+/).every((palabra) => texto.includes(palabra));
}

export function veedoresDisponibles(cuentas: Cuenta[], ocupados: Set<string>, recintoId: number) {
  return cuentas.filter((cuenta) => cuenta.rol_codigo === 'veedor'
    && cuenta.activo && cuenta.recinto_base_id === recintoId && !ocupados.has(cuenta.usuario_id));
}
