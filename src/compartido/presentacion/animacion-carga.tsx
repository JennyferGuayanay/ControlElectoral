import { ActivityIndicator } from 'react-native';

import { colores } from './tema-electoral';

export default function AnimacionCarga() {
  return <ActivityIndicator color={colores.azulBrillante} />;
}
