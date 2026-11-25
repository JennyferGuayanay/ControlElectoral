import { useState } from 'react';
import type { Href } from 'expo-router';

import { Boton } from '@/modulos/acceso/presentacion/interfaz';
import { EstadoConsulta, EstadoRegistro, Pantalla, Tarjeta, Texto, useConsulta } from '@/modulos/operacion/presentacion/componentes';

import type { RepositorioActas } from '../aplicacion/actas';
import { dignidades, nombreDignidad, type Dignidad } from '../dominio/acta';
import { CabeceraActa, DetallePublicado } from './lectura-acta';

export function PantallaConsultarActas({ repositorio, mesaId, inicio, etiquetaVolver }: {
  repositorio: RepositorioActas; mesaId: number; inicio: Href; etiquetaVolver?: string;
}) {
  const [abierta, fijarAbierta] = useState<Dignidad>();
  const consulta = useConsulta(['actas-mesa', mesaId], () => repositorio.mesaVisible(mesaId));
  const contexto = consulta.data;

  return (
    <Pantalla titulo="Actas de la mesa" inicio={inicio} etiquetaVolver={etiquetaVolver} iconoGestion="actas">
      <Boton titulo="Actualizar actas de la mesa" variante="secundario" icono="sincronizacion" cargando={consulta.isFetching}
        alPulsar={() => { void consulta.refetch(); }} />
      <EstadoConsulta consulta={consulta}>
        {contexto ? (
          <>
            <CabeceraActa mesa={contexto.mesa} />
            {dignidades.map((dignidad) => {
              const acta = contexto.registradas.find((registro) => registro.dignidad === dignidad);
              const candidatos = contexto.contiendas.find((contienda) => contienda.dignidad === dignidad)?.candidatos ?? [];
              const expandida = abierta === dignidad;
              return (
                <Tarjeta key={dignidad} titulo={nombreDignidad[dignidad]} icono="actas">
                  <EstadoRegistro texto={acta ? 'Acta recibida' : 'Sin acta registrada'} tono={acta ? 'positivo' : 'neutro'} />
                  {acta ? (
                    <>
                      <Boton titulo={expandida ? 'Cerrar detalle' : `Ver acta de ${nombreDignidad[dignidad]}`}
                        variante="secundario" icono="ojo" alPulsar={() => fijarAbierta(expandida ? undefined : dignidad)} />
                      {expandida && <DetallePublicado id={acta.id} candidatos={candidatos} repositorio={repositorio} />}
                    </>
                  ) : null}
                </Tarjeta>
              );
            })}
          </>
        ) : <Texto>Esta mesa no está disponible en tu jurisdicción.</Texto>}
      </EstadoConsulta>
    </Pantalla>
  );
}
