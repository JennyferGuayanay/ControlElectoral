import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { Aviso, Boton, Enlace, errorDeCampo, mensajeDeError, type Mensaje } from '@/modulos/acceso/presentacion/interfaz';

import type { RepositorioOperacion } from '../aplicacion/operacion';
import { coincideBusqueda, esquemaRecintoNuevo, rotuloMesa, type Parroquia, type RecintoNuevo } from '../dominio/operacion';
import {
  CampoGestion, DetalleMesa, EstadoConsulta, EstadoRegistro, Lista, Opciones, Pantalla, ResumenGestion, Tarjeta, Texto,
  useActualizar, useConsulta,
} from './componentes';

function rotuloParroquia(parroquia: Parroquia) {
  return parroquia.canton ? `${parroquia.nombre} · ${parroquia.canton.nombre}` : parroquia.nombre;
}

function FormularioRecinto({
  parroquias, inicial, guardar,
}: { parroquias: Parroquia[]; inicial: number | null; guardar(datos: RecintoNuevo): Promise<void> }) {
  const formulario = useForm({
    defaultValues: { parroquiaId: inicial, nombre: '', zona: '', direccion: '' },
    validators: { onChange: esquemaRecintoNuevo, onSubmit: esquemaRecintoNuevo },
    onSubmit: async ({ value }) => {
      const datos = esquemaRecintoNuevo.parse(value);
      if (datos.parroquiaId !== null) await guardar({ ...datos, parroquiaId: datos.parroquiaId });
    },
  });

  return (
    <Tarjeta titulo="Nuevo recinto" icono="ubicacion">
      <Texto>Parroquia del recinto</Texto>
      <formulario.Field name="parroquiaId">
        {(campo) => (
          <>
            <Opciones<number> opciones={parroquias.map((item) => ({ id: item.id, texto: rotuloParroquia(item) }))}
              valor={campo.state.value} elegir={campo.handleChange} />
            <Aviso mensaje={errorDeCampo(campo.state.meta.errors) ? { tipo: 'error', texto: 'Selecciona una parroquia.' } : null} />
          </>
        )}
      </formulario.Field>
      {([
        ['nombre', 'Nombre del recinto'], ['zona', 'Zona (opcional)'], ['direccion', 'Dirección (opcional)'],
      ] as const).map(([name, etiqueta]) => (
        <formulario.Field key={name} name={name}>
          {(campo) => <CampoGestion etiqueta={etiqueta} value={campo.state.value} onBlur={campo.handleBlur}
            onChangeText={campo.handleChange} error={errorDeCampo(campo.state.meta.errors)} />}
        </formulario.Field>
      ))}
      <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
        {(guardando) => <Boton titulo="Guardar recinto" tituloCarga="Guardando…" cargando={guardando}
          alPulsar={() => void formulario.handleSubmit()} />}
      </formulario.Subscribe>
    </Tarjeta>
  );
}

function MesasTerritorio({ repositorio, recintoId }: { repositorio: RepositorioOperacion; recintoId: number }) {
  const [buscar, fijarBuscar] = useState('');
  const mesas = useConsulta(['mesas', recintoId], () => repositorio.mesas(recintoId));
  return (
    <Tarjeta titulo="Mesas del recinto" icono="mesa">
      <EstadoConsulta consulta={mesas}>
        <EstadoRegistro texto={`Total de mesas del recinto: ${mesas.data?.length ?? 0}`} tono="neutro" />
        <CampoGestion etiqueta="Buscar mesa" value={buscar} onChangeText={fijarBuscar} />
        <Lista datos={(mesas.data ?? []).filter((mesa) => coincideBusqueda(buscar, rotuloMesa(mesa)))}
          clave={(mesa) => mesa.id} vacio="No hay mesas que mostrar."
          mostrar={(mesa) => (
            <Tarjeta titulo={`Mesa ${mesa.numero_jrv_cne ?? mesa.numero}`} icono="mesa">
              <DetalleMesa mesa={mesa} />
              <Enlace href={{ pathname: '/actas-provinciales', params: { mesa: String(mesa.id) } }} texto="Consultar actas de esta mesa" />
            </Tarjeta>
          )} />
      </EstadoConsulta>
    </Tarjeta>
  );
}

export function PantallaTerritorio({ repositorio }: { repositorio: RepositorioOperacion }) {
  const parroquias = useConsulta(['parroquias'], repositorio.parroquias);
  const recintos = useConsulta(['recintos'], repositorio.recintos);
  const [parroquiaId, fijarParroquiaId] = useState(0);
  const [recintoAbierto, fijarRecintoAbierto] = useState<number | null>(null);
  const [buscar, fijarBuscar] = useState('');
  const [nuevo, fijarNuevo] = useState(false);
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const actualizar = useActualizar();
  const alta = useMutation({ mutationFn: repositorio.agregarRecinto, onSettled: actualizar });

  async function guardar(datos: RecintoNuevo) {
    fijarMensaje(undefined);
    try {
      await alta.mutateAsync(datos);
      fijarNuevo(false);
      fijarBuscar('');
      fijarParroquiaId(datos.parroquiaId);
      fijarMensaje({ tipo: 'exito', texto: 'Recinto creado correctamente.' });
    } catch (error) {
      fijarMensaje(mensajeDeError(error, 'No pudimos crear el recinto.'));
    }
  }

  const sectores = parroquias.data ?? [];
  const cantones = new Map<string | null, Parroquia[]>();
  for (const parroquia of sectores) {
    const canton = parroquia.canton?.nombre ?? null;
    const grupo = cantones.get(canton);
    if (grupo) grupo.push(parroquia);
    else cantones.set(canton, [parroquia]);
  }
  const porId = new Map(sectores.map((parroquia) => [parroquia.id, parroquia]));
  const visibles = (recintos.data ?? []).filter((recinto) =>
    (!parroquiaId || recinto.parroquia_id === parroquiaId)
    && coincideBusqueda(buscar, recinto.nombre, recinto.zona, recinto.direccion, porId.get(recinto.parroquia_id)?.nombre));

  return (
    <Pantalla titulo="Territorio electoral" detalle="Cantones, parroquias, recintos y mesas bajo tu jurisdicción."
      inicio="/provincial" iconoGestion="territorio">
      <EstadoConsulta consulta={parroquias}>
        <EstadoConsulta consulta={recintos}>
          <ResumenGestion datos={[
            { etiqueta: 'Cantones', cantidad: cantones.size - Number(cantones.has(null)), icono: 'territorio', tono: 'alerta' },
            { etiqueta: 'Parroquias', cantidad: sectores.length, icono: 'ubicacion', tono: 'neutro' },
            { etiqueta: 'Recintos', cantidad: recintos.data?.length ?? 0, icono: 'actas', tono: 'positivo' },
          ]} />
          <Boton titulo={nuevo ? 'Cerrar formulario' : 'Agregar recinto'} alPulsar={() => {
            fijarNuevo(!nuevo);
            fijarMensaje(undefined);
          }} deshabilitado={!sectores.length || alta.isPending} icono="ubicacion" />
          {nuevo && <FormularioRecinto parroquias={sectores} inicial={parroquiaId || null} guardar={guardar} />}
          <Aviso mensaje={mensaje} />
          <Tarjeta titulo="Parroquias" icono="territorio">
            <Opciones opciones={[{ id: 0, texto: 'Todas' }]}
              valor={parroquiaId} elegir={(id) => { fijarParroquiaId(id); fijarRecintoAbierto(null); }} />
            {[...cantones].map(([canton, grupo]) => (
              <Tarjeta key={canton ?? ''} titulo={canton ? `Cantón ${canton}` : 'Parroquias sin cantón visible'} icono="ubicacion">
                <Opciones opciones={grupo.map((item) => ({ id: item.id, texto: rotuloParroquia(item) }))}
                  valor={parroquiaId} elegir={(id) => { fijarParroquiaId(id); fijarRecintoAbierto(null); }} />
              </Tarjeta>
            ))}
          </Tarjeta>
          <CampoGestion etiqueta="Buscar en recintos" value={buscar} onChangeText={fijarBuscar} />
          <Texto>{visibles.length} recintos encontrados</Texto>
          <Lista datos={visibles} clave={(item) => item.id} vacio="No hay recintos con los filtros seleccionados."
            mostrar={(recinto) => {
              const parroquia = porId.get(recinto.parroquia_id);
              const abierto = recintoAbierto === recinto.id;
              return (
                <Tarjeta titulo={recinto.nombre} icono="ubicacion">
                  {parroquia && <Texto>{rotuloParroquia(parroquia)}</Texto>}
                  {!!recinto.zona && <Texto>Zona {recinto.zona}</Texto>}
                  {!!recinto.direccion && <Texto>{recinto.direccion}</Texto>}
                  <Boton titulo={abierto ? 'Ocultar mesas' : 'Consultar mesas'} variante="secundario" icono="mesa"
                    alPulsar={() => fijarRecintoAbierto(abierto ? null : recinto.id)} />
                  {abierto && <MesasTerritorio repositorio={repositorio} recintoId={recinto.id} />}
                </Tarjeta>
              );
            }} />
        </EstadoConsulta>
      </EstadoConsulta>
    </Pantalla>
  );
}
