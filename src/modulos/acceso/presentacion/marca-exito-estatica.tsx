import { StyleSheet, Text, View } from 'react-native';

export default function MarcaExitoEstatica() {
  return (
    <View style={estilos.sello} accessible={false}>
      <Text style={estilos.marca}>✓</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  sello: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D7EEE0',
  },
  marca: { color: '#166040', fontSize: 25, fontWeight: '700' },
});
