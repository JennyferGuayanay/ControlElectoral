import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import marcaExito from '@/assets/animaciones/marca-exito.json';

import MarcaEstatica from './marca-exito-estatica';

export default function AnimacionExito() {
  const reducirMovimiento = useReducedMotion();

  if (reducirMovimiento) return <MarcaEstatica />;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LottieView autoPlay loop={false} speed={0.9} source={marcaExito} style={{ width: 40, height: 40 }} />
    </View>
  );
}
