import { useForm } from '@tanstack/react-form';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { Aviso, Boton, errorDeCampo, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';

import type { RepositorioOperacion } from '../aplicacion/operacion';
import { coincideBusqueda, esquemaCuentaNueva, nombreCompleto, type Cuenta, type CuentaNueva, type Recinto, type RolGestionado } from '../dominio/operacion';
import {
  CampoGestion, EstadoConsulta, EstadoRegistro, Lista, Opciones, Pantalla, ResumenGestion, SelectorRecinto, Tarjeta, Texto,
  useActualizar, useConsulta,
} from './componentes';

type Alcance = 'provincial' | 'recinto';
type Accion = 'estado' | 'clave';

const filtros = [
  { id: 'todas', texto: 'Todas' }, { id: 'habilitadas', texto: 'Habilitadas' }, { id: 'desactivadas', texto: 'Desactivadas' },
] as const;
type Filtro = (typeof filtros)[number]['id'];

function FormularioCuenta({
  rol, recintoId, guardar, ocupado,
}: { rol: RolGestionado; recintoId: number | null; guardar(datos: CuentaNueva): Promise<void>; ocupado: boolean }) {
  const formulario = useForm({
    defaultValues: { cedula: '', nombres: '', apellidos: '', telefono: '', correo: '', recintoId },
    validators: { onChange: esquemaCuentaNueva, onSubmit: esquemaCuentaNueva },
    onSubmit: async ({ value }) => {
      const datos = esquemaCuentaNueva.parse(value);
      if (rol === 'recinto') await guardar({ ...datos, rol, recintoId: null });
      if (rol === 'veedor' && recintoId !== null) await guardar({ ...datos, rol, recintoId });
    },
  });

  return (
    <Tarjeta titulo={rol === 'recinto' ? 'Nuevo coordinador de recinto' : 'Nuevo veedor'} icono="persona">
      {([
        ['cedula', 'Cédula', 'numeric'], ['nombres', 'Nombres', 'text'], ['apellidos', 'Apellidos', 'text'],
        ['telefono', 'Teléfono', 'tel'], ['correo', 'Correo electrónico', 'email'],
      ] as const).map(([name, etiqueta, inputMode]) => (
        <formulario.Field key={name} name={name}>
          {(campo) => <CampoGestion etiqueta={etiqueta} inputMode={inputMode} value={campo.state.value} onBlur={campo.handleBlur}
            icono={name === 'correo' ? 'correo' : undefined}
            editable={!ocupado} autoCapitalize={name === 'correo' ? 'none' : undefined}
            autoCorrect={name === 'correo' ? false : undefined}
            onChangeText={campo.handleChange} error={errorDeCampo(campo.state.meta.errors)} />}
        </formulario.Field>
      ))}
      <Boton titulo="Crear cuenta" tituloCarga="Creando…" cargando={ocupado}
        alPulsar={() => void formulario.handleSubmit()} />
    </Tarjeta>
  );
}

function Directorio({
  repositorio, rol, recintoId, recintos, requiereRecinto,
}: { repositorio: RepositorioOperacion; rol: RolGestionado; recintoId: number | null; recintos: Recinto[]; requiereRecinto: boolean }) {
  const cuentas = useConsulta(['cuentas', rol, recintoId ?? 0], () => repositorio.cuentas(rol, recintoId ?? undefined));
  const [buscar, fijarBuscar] = useState('');
  const [filtro, fijarFiltro] = useState<Filtro>('todas');
  const [nuevo, fijarNuevo] = useState(false);
  const [seleccion, fijarSeleccion] = useState<{ cuenta: Cuenta; accion: Accion }>();
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const [temporal, fijarTemporal] = useState<string>();
  const [ocupado, fijarOcupado] = useState(false);
  const vista = useRef(0);
  const actualizar = useActualizar();

  useFocusEffect(useCallback(() => {
    function olvidar() {
      vista.current += 1;
      fijarTemporal(undefined);
    }
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') olvidar();
    });
    return () => { suscripcion.remove(); olvidar(); };
  }, []));

  async function ejecutar(operacion: () => Promise<string | void>, exito: string) {
    if (ocupado) return;
    const origen = vista.current;
    fijarOcupado(true);
    fijarMensaje(undefined);
    fijarTemporal(undefined);
    try {
      const clave = await operacion();
      fijarNuevo(false);
      fijarSeleccion(undefined);
      if (typeof clave === 'string' && vista.current === origen) fijarTemporal(clave);
      fijarMensaje({ tipo: 'exito', texto: exito });
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos completar la operación.'));
    } finally {
      await actualizar();
      fijarOcupado(false);
    }
  }

  function procesarSeleccion() {
    if (!seleccion) return;
    const { cuenta, accion } = seleccion;
    if (accion === 'clave') {
      void ejecutar(() => repositorio.restablecerClave(cuenta.usuario_id), 'Contraseña temporal restablecida.');
    } else {
      void ejecutar(() => repositorio.cambiarEstadoCuenta(cuenta.usuario_id, !cuenta.activo),
        cuenta.activo ? 'Cuenta desactivada.' : 'Cuenta habilitada.');
    }
  }

  const directorio = (cuentas.data ?? []).filter((cuenta) => recintoId === null || cuenta.recinto_base_id === recintoId);
  const activas = directorio.filter(({ activo }) => activo).length;
  const visibles = directorio.filter((cuenta) => (
    (filtro === 'todas' || cuenta.activo === (filtro === 'habilitadas'))
    && coincideBusqueda(buscar, nombreCompleto(cuenta), cuenta.correo)
  ));

  return (
    <>
      <Boton titulo={nuevo ? 'Cerrar formulario' : 'Nueva cuenta'} deshabilitado={ocupado || (requiereRecinto && recintoId === null)}
        icono="persona"
        alPulsar={() => { fijarNuevo(!nuevo); fijarMensaje(undefined); fijarTemporal(undefined); fijarSeleccion(undefined); }} />
      {requiereRecinto && recintoId === null && <Texto>Selecciona el recinto base para crear un veedor.</Texto>}
      {nuevo && <FormularioCuenta rol={rol} recintoId={recintoId} ocupado={ocupado}
        guardar={(datos) => ejecutar(() => repositorio.crearCuenta(datos), 'Cuenta creada correctamente.')} />}
      <Aviso mensaje={mensaje} />
      {temporal && (
        <Tarjeta titulo="Contraseña temporal" icono="llave">
          <Texto>Entrégala a su titular por un canal seguro. La necesitará en el primer ingreso.</Texto>
          <CampoGestion etiqueta="Contraseña temporal" value={temporal} editable={false} autoComplete="off" esClave />
          <Boton titulo="Ocultar y cerrar" variante="secundario" alPulsar={() => fijarTemporal(undefined)} />
        </Tarjeta>
      )}
      <Tarjeta titulo="Filtrar cuentas" icono="cuentas">
        <CampoGestion etiqueta="Buscar por nombre o correo" value={buscar} onChangeText={fijarBuscar} autoCapitalize="none" />
        <Opciones<Filtro> opciones={[...filtros]} valor={filtro} elegir={fijarFiltro} />
      </Tarjeta>
      <EstadoConsulta consulta={cuentas}>
        <ResumenGestion datos={[
          { etiqueta: 'Habilitadas', cantidad: activas, icono: 'persona', tono: 'positivo' },
          { etiqueta: 'Desactivadas', cantidad: directorio.length - activas, icono: 'escudo', tono: 'negativo' },
        ]} />
        <Lista datos={visibles} clave={(cuenta) => cuenta.usuario_id} vacio="No hay cuentas con los filtros seleccionados."
          mostrar={(cuenta) => {
            const confirma = seleccion?.cuenta.usuario_id === cuenta.usuario_id;
            const primerIngresoPendiente = cuenta.activo && (cuenta.cambio_clave_pendiente || !cuenta.correo_verificado_en);
            const recinto = recintos.find(({ id }) => id === cuenta.recinto_base_id);
            return (
              <Tarjeta titulo={nombreCompleto(cuenta)} icono="persona">
                <Texto destacado>{cuenta.rol_codigo === 'recinto' ? 'Coordinación de recinto' : 'Veeduría electoral'}</Texto>
                <EstadoRegistro texto={cuenta.activo ? 'Habilitada' : 'Desactivada'} tono={cuenta.activo ? 'positivo' : 'negativo'} />
                {primerIngresoPendiente && <EstadoRegistro texto="Primer ingreso pendiente" tono="alerta" />}
                <Texto>{cuenta.correo}</Texto>
                {recinto && <Texto>{recinto.nombre}</Texto>}
                {confirma ? (
                  <>
                    <Texto>{seleccion.accion === 'clave'
                      ? 'Se generará otra contraseña temporal. La persona deberá cambiarla al ingresar.'
                      : cuenta.activo ? 'Esta persona perderá acceso mientras su cuenta esté desactivada.' : 'Confirma que esta persona puede volver a ingresar.'}</Texto>
                    <Boton titulo="Confirmar operación" cargando={ocupado}
                      variante={seleccion.accion === 'estado' && cuenta.activo ? 'peligro' : 'principal'}
                      alPulsar={procesarSeleccion} />
                    <Boton titulo="Cancelar" variante="secundario" deshabilitado={ocupado} alPulsar={() => fijarSeleccion(undefined)} />
                  </>
                ) : (
                  <>
                    <Boton titulo={cuenta.activo ? 'Desactivar cuenta' : 'Habilitar cuenta'}
                      variante={cuenta.activo ? 'peligro' : 'exito'} icono={cuenta.activo ? 'error' : 'persona'}
                      deshabilitado={ocupado} alPulsar={() => fijarSeleccion({ cuenta, accion: 'estado' })} />
                    <Boton titulo="Restablecer clave" variante="secundario" icono="llave" deshabilitado={ocupado || !cuenta.activo}
                      alPulsar={() => fijarSeleccion({ cuenta, accion: 'clave' })} />
                  </>
                )}
              </Tarjeta>
            );
          }} />
      </EstadoConsulta>
    </>
  );
}

export function PantallaCuentas({ alcance, repositorio }: { alcance: Alcance; repositorio: RepositorioOperacion }) {
  const [rol, fijarRol] = useState<RolGestionado>(alcance === 'provincial' ? 'recinto' : 'veedor');
  const [recintoElegido, fijarRecinto] = useState<number | null>(null);
  const recintos = useConsulta(['recintos'], repositorio.recintos);
  const lista = recintos.data ?? [];
  const recintoId = rol === 'veedor'
    ? (lista.some(({ id }) => id === recintoElegido) ? recintoElegido : alcance === 'recinto' && lista.length === 1 ? lista[0].id : null)
    : null;

  return (
    <Pantalla titulo={alcance === 'provincial' ? 'Gestión de cuentas' : 'Veedores del recinto'}
      iconoGestion="cuentas"
      inicio={alcance === 'provincial' ? '/provincial' : '/recinto'}>
      {alcance === 'provincial' && (
        <Opciones<RolGestionado> opciones={[{ id: 'recinto', texto: 'Coordinadores de recinto' }, { id: 'veedor', texto: 'Veedores' }]}
          valor={rol} elegir={fijarRol} />
      )}
      <EstadoConsulta consulta={recintos}>
        {rol === 'veedor' && (
          <>
            <SelectorRecinto recintos={lista} recintoId={recintoId} elegir={fijarRecinto} />
            {alcance === 'provincial' && recintoId !== null && (
              <Boton titulo="Ver veedores de todos los recintos" variante="secundario" alPulsar={() => fijarRecinto(null)} />
            )}
          </>
        )}
        {(alcance === 'provincial' || recintoId !== null) && (
          <Directorio key={`${rol}-${recintoId}`} repositorio={repositorio} rol={rol} recintoId={recintoId}
            recintos={lista} requiereRecinto={rol === 'veedor'} />
        )}
      </EstadoConsulta>
    </Pantalla>
  );
}
