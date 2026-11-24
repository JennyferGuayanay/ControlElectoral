import { ActivityIndicator } from 'react-native';

import { CierreSesion } from './cierre-sesion';
import { Aviso, Boton, colores, Encabezado, Marco, Panel } from './interfaz';
import { useAcceso } from './proveedor-acceso';

export default function PantallaEstadoAcceso() {
  const { estado, revisar, sesion } = useAcceso();

  if (estado.tipo === 'bloqueado' || estado.tipo === 'error') {
    return (
      <Marco>
        <Encabezado titulo={estado.tipo === 'bloqueado' ? 'Acceso restringido' : 'Comprobación de acceso'} />
        <Panel>
          <Aviso mensaje={{
            tipo: 'error',
            texto: estado.tipo === 'error'
              ? estado.mensaje
              : 'Tu cuenta no está habilitada para entrar. Contacta a tu coordinador.',
          }} />
          {sesion && <Boton titulo="Comprobar de nuevo" alPulsar={revisar} />}
          {sesion && <CierreSesion />}
        </Panel>
      </Marco>
    );
  }

  return (
    <Marco>
      <Encabezado titulo="Comprobando tu acceso" />
      <ActivityIndicator
        size="large"
        color={colores.azul}
        accessibilityLabel="Comprobando tu acceso"
        accessibilityState={{ busy: true }}
      />
    </Marco>
  );
}
