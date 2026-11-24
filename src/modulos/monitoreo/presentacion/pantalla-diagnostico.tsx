import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Aviso, Boton, colores, Encabezado, Enlace, Marco, Panel } from '@/modulos/acceso/presentacion/interfaz';
import type { Mensaje } from '@/modulos/acceso/presentacion/interfaz';

import type { ReportarFallo } from '../aplicacion/monitoreo';

type Props = {
  reportarFallo: ReportarFallo;
  falloNativo?: () => void;
};

export function PantallaDiagnostico({ reportarFallo, falloNativo }: Props) {
  const [mensaje, fijarMensaje] = useState<Mensaje>();
  const [confirmar, fijarConfirmar] = useState(false);

  function probarFalloControlado() {
    try {
      throw new Error('Sentry test error');
    } catch (error) {
      const id = reportarFallo('prueba-defensa', error);
      fijarMensaje(id
        ? { tipo: 'info', texto: `Evento registrado en el SDK: ${id}. Comprueba su recepción en Sentry.` }
        : { tipo: 'error', texto: 'El SDK de monitoreo no está disponible en esta compilación.' });
    }
  }

  return (
    <Marco>
      <Encabezado titulo="Diagnóstico de Sentry" />
      <Panel>
        <Text style={estilos.texto}>Genera un error de prueba. Puedes activar el modo avión antes de pulsar y volver a conectar después.</Text>
        <Boton titulo="Registrar error controlado" alPulsar={probarFalloControlado} />
        <Aviso mensaje={mensaje} />
      </Panel>
      {falloNativo && (
        <Panel>
          <Text style={estilos.texto}>La prueba fatal cerrará la aplicación. Ábrela de nuevo para que el SDK pueda enviar el informe.</Text>
          {confirmar ? (
            <>
              <Boton titulo="Confirmar cierre por error nativo" alPulsar={falloNativo} />
              <Boton titulo="Cancelar" variante="secundario" alPulsar={() => fijarConfirmar(false)} />
            </>
          ) : (
            <Boton titulo="Preparar prueba fatal nativa" variante="secundario" alPulsar={() => fijarConfirmar(true)} />
          )}
        </Panel>
      )}
      <Enlace href="/provincial" texto="Volver al inicio provincial" />
    </Marco>
  );
}

const estilos = StyleSheet.create({
  texto: { color: colores.texto, fontSize: 16, lineHeight: 24 },
});
