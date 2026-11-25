import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import animacion from '@/assets/animaciones/carga-seguimiento.json';
import { IconoElectoral } from './graficos-electorales';

export default function AnimacionCarga() {
  const reducirMovimiento = useReducedMotion();
  if (reducirMovimiento) return <IconoElectoral nombre="sincronizacion" tamano={29} />;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LottieView source={animacion} autoPlay loop style={{ width: 43, height: 34 }} />
    </View>
  );
}
