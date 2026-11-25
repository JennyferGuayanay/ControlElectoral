import { useForm } from '@tanstack/react-form';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { IconoElectoral, type NombreIcono } from '@/compartido/presentacion/graficos-electorales';
import { colores, superficieTarjeta } from '@/compartido/presentacion/tema-electoral';
import { Aviso, Boton, errorDeCampo } from '@/modulos/acceso/presentacion/interfaz';
import { CampoGestion, EstadoRegistro, Tarjeta } from '@/modulos/operacion/presentacion/componentes';

import { esquemaFormulario, leerNumero, prepararValores, sumarVotos, type Candidato, type ValoresActa } from '../dominio/acta';

const entrada = FadeInDown.duration(190).reduceMotion(ReduceMotion.System);
const formato = new Intl.NumberFormat('es-EC');

const camposNumericos = [
  { name: 'blancos', etiqueta: 'Votos blancos', icono: 'urna' },
  { name: 'nulos', etiqueta: 'Votos nulos', icono: 'error' },
  { name: 'sufragantes', etiqueta: 'Total de sufragantes', icono: 'cuentas' },
] as const;

type ControlCantidad = {
  etiqueta: string;
  valor: string;
  cambiar(texto: string): void;
  alSalir(): void;
  error?: string;
};

function EntradaCantidad({ etiqueta, valor, cambiar, alSalir, error }: ControlCantidad) {
  const [enFoco, fijarFoco] = useState(false);

  return (
    <TextInput
      accessibilityLabel={etiqueta}
      accessibilityHint={error}
      inputMode="numeric"
      returnKeyType="done"
      value={valor}
      placeholder="—"
      placeholderTextColor={colores.secundario}
      onChangeText={cambiar}
      onFocus={() => fijarFoco(true)}
      onBlur={() => { fijarFoco(false); alSalir(); }}
      style={[estilos.cantidad, enFoco && estilos.cantidadFoco, !!error && estilos.cantidadError]}
    />
  );
}

function ErrorCantidad({ texto }: { texto?: string }) {
  return texto ? <Text accessibilityLiveRegion="polite" style={estilos.error}>{texto}</Text> : null;
}

function AjusteCantidad({ etiqueta, siguiente, cambiar, restar }: {
  etiqueta: string; siguiente?: number; cambiar(texto: string): void; restar?: boolean;
}) {
  const deshabilitado = siguiente === undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${restar ? 'Disminuir' : 'Aumentar'} ${etiqueta}`}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={() => { if (siguiente !== undefined) cambiar(String(siguiente)); }}
      style={({ pressed }) => [estilos.ajuste, restar ? estilos.restar : estilos.sumar,
        deshabilitado && estilos.ajusteDeshabilitado, pressed && estilos.ajustePresionado]}>
      <Text style={[estilos.signo, deshabilitado && estilos.signoDeshabilitado]}>{restar ? '−' : '+'}</Text>
    </Pressable>
  );
}

function TarjetaCandidatura({ candidato, control, horizontal }: {
  candidato: Candidato; control: ControlCantidad; horizontal: boolean;
}) {
  const numero = leerNumero(control.valor);
  const anterior = numero !== undefined && numero > 0 ? numero - 1 : undefined;
  const base = control.valor.trim() === '' ? 0 : numero;
  const siguiente = base === undefined ? undefined : leerNumero(String(base + 1));

  return (
    <Animated.View entering={entrada} style={[estilos.candidatura, { borderLeftColor: candidato.color }]}>
      <View style={estilos.identidad}>
        <View style={estilos.retrato}><IconoElectoral nombre="persona" tamano={25} /></View>
        <View style={estilos.textos}>
          <Text style={estilos.nombre}>{candidato.nombre}</Text>
          {candidato.binomio && <Text style={estilos.organizacion}>{candidato.binomio}</Text>}
        </View>
      </View>
      <View style={[estilos.filaCandidatura, horizontal && estilos.filaHorizontal]}>
        <View style={estilos.datosLista}>
          <Text style={estilos.organizacion}>{candidato.organizacion}</Text>
          <View style={estilos.lista}>
            <View aria-hidden style={[estilos.colorLista, { backgroundColor: candidato.color }]} />
            <Text style={estilos.numeroLista}>Lista {candidato.lista}</Text>
          </View>
          {candidato.simulacion && <Text style={estilos.simulacion}>Datos de simulación</Text>}
        </View>
        <View style={[estilos.control, horizontal && estilos.controlCorto]}>
          <Text style={estilos.etiquetaVotos}>Votos</Text>
          <View style={estilos.ajustes}>
            <AjusteCantidad etiqueta={control.etiqueta.toLowerCase()} siguiente={anterior} cambiar={control.cambiar} restar />
            <EntradaCantidad {...control} />
            <AjusteCantidad etiqueta={control.etiqueta.toLowerCase()} siguiente={siguiente} cambiar={control.cambiar} />
          </View>
        </View>
      </View>
      <ErrorCantidad texto={control.error} />
    </Animated.View>
  );
}

function CasillaResumen({ etiqueta, icono, tipo, children }: {
  etiqueta: string; icono: NombreIcono; tipo: 'blancos' | 'nulos' | 'sufragantes' | 'total'; children: ReactNode;
}) {
  return (
    <View style={[estilos.casilla, estilos[tipo]]}>
      <View style={estilos.cabeceraCasilla}>
        <IconoElectoral nombre={icono} tamano={21} color={tipo === 'nulos' ? colores.error : colores.azul} />
        <Text style={estilos.etiquetaCasilla}>{etiqueta}</Text>
      </View>
      {children}
    </View>
  );
}

function BalanceVotos({ valores }: { valores: ValoresActa }) {
  const total = leerNumero(valores.sufragantes);
  const completos = [valores.blancos, valores.nulos, ...valores.votos.map(({ cantidad }) => cantidad)]
    .every((texto) => leerNumero(texto) !== undefined);

  if (!completos || total === undefined) {
    return <Aviso mensaje={{ tipo: 'info', texto: 'Completa los campos para comprobar el total.' }} />;
  }

  const suma = sumarVotos(valores);
  return suma === total
    ? <Aviso mensaje={{ tipo: 'exito', texto: 'Los votos coinciden con el total de sufragantes.' }} />
    : <Aviso mensaje={{ tipo: 'error', texto: `Los totales no coinciden. Diferencia: ${formato.format(Math.abs(suma - total))}.` }} />;
}

export function FormularioActa({ candidatos, inicial, guardar }: {
  candidatos: Candidato[]; inicial: ValoresActa;
  guardar(valores: ValoresActa, continuar: boolean): Promise<void>;
}) {
  const { width, fontScale } = useWindowDimensions();
  const horizontal = width >= 390 && fontScale <= 1.15;
  const esquema = esquemaFormulario(candidatos);
  const formulario = useForm({
    defaultValues: prepararValores(candidatos, inicial),
    validators: { onChange: esquema, onSubmit: esquema },
    onSubmit: async ({ value }) => guardar(value, true),
  });

  return (
    <>
      <Aviso mensaje={{ tipo: 'info', texto: 'Transcribe los resultados del acta. Escribe 0 si una lista no obtuvo votos.' }} />
      <View style={estilos.tituloListas}>
        <IconoElectoral nombre="cuentas" color={colores.blanco} />
        <Text accessibilityRole="header" style={estilos.textoListas}>Votos por candidatura</Text>
      </View>
      <View style={estilos.candidaturas}>
        {candidatos.map((candidato, indice) => (
          <formulario.Field key={candidato.id} name={`votos[${indice}].cantidad` as const}>
            {(campo) => (
              <TarjetaCandidatura candidato={candidato} horizontal={horizontal} control={{
                etiqueta: `Votos de la lista ${candidato.lista}`, valor: campo.state.value,
                cambiar: campo.handleChange, alSalir: campo.handleBlur, error: errorDeCampo(campo.state.meta.errors),
              }} />
            )}
          </formulario.Field>
        ))}
      </View>
      <Tarjeta titulo="Resumen electoral" icono="seguimiento">
        <View style={estilos.resumen}>
          {camposNumericos.map(({ name, etiqueta, icono }) => (
            <formulario.Field key={name} name={name}>
              {(campo) => {
                const error = errorDeCampo(campo.state.meta.errors);
                return (
                  <CasillaResumen etiqueta={etiqueta} icono={icono} tipo={name}>
                    <EntradaCantidad etiqueta={etiqueta} valor={campo.state.value} cambiar={campo.handleChange}
                      alSalir={campo.handleBlur} error={error} />
                    <ErrorCantidad texto={error} />
                  </CasillaResumen>
                );
              }}
            </formulario.Field>
          ))}
          <formulario.Subscribe selector={(estado) => sumarVotos(estado.values)}>
            {(total) => (
              <CasillaResumen etiqueta="Total de votos" icono="mesa" tipo="total">
                <Text accessibilityLiveRegion="polite" style={estilos.totalNumero}>{formato.format(total)}</Text>
              </CasillaResumen>
            )}
          </formulario.Subscribe>
        </View>
        <formulario.Subscribe selector={(estado) => estado.values}>
          {(valores) => <BalanceVotos valores={valores} />}
        </formulario.Subscribe>
      </Tarjeta>
      <Tarjeta titulo="Identificación del acta" icono="actas">
        <EstadoRegistro texto="En borrador" tono="neutro" />
        {([['numeroActa', 'Número de acta (opcional)'], ['codigoControl', 'Código de control (opcional)']] as const)
          .map(([name, etiqueta]) => (
            <formulario.Field key={name} name={name}>
              {(campo) => <CampoGestion etiqueta={etiqueta} value={campo.state.value} onChangeText={campo.handleChange}
                onBlur={campo.handleBlur} error={errorDeCampo(campo.state.meta.errors)} />}
            </formulario.Field>
          ))}
      </Tarjeta>
      <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
        {(guardando) => (
          <View style={estilos.acciones}>
            <View style={estilos.accion}>
              <Boton titulo="Guardar borrador y salir" deshabilitado={guardando} variante="secundario" icono="actas"
                style={estilos.botonAccion}
                alPulsar={() => void guardar(formulario.state.values, false)} />
            </View>
            <View style={estilos.accion}>
              <Boton titulo="Continuar a evidencia" cargando={guardando} icono="flecha" style={estilos.botonAccion}
                alPulsar={() => void formulario.handleSubmit()} />
            </View>
          </View>
        )}
      </formulario.Subscribe>
    </>
  );
}

const estilos = StyleSheet.create({
  tituloListas: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colores.azul,
    borderLeftWidth: 5, borderLeftColor: colores.amarillo, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9,
  },
  textoListas: { flex: 1, color: colores.blanco, fontWeight: '900', fontSize: 18 },
  candidaturas: { gap: 8 },
  candidatura: { ...superficieTarjeta, borderLeftWidth: 5, borderWidth: 1.5, padding: 9, gap: 5 },
  filaCandidatura: { gap: 7 },
  filaHorizontal: { flexDirection: 'row', alignItems: 'center' },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  retrato: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.azulSuave },
  textos: { flex: 1, gap: 2 },
  datosLista: { flexGrow: 1, flexShrink: 1, gap: 3 },
  nombre: { color: colores.azul, fontWeight: '900', fontSize: 17 },
  organizacion: { color: colores.secundario, fontSize: 14, lineHeight: 19 },
  lista: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4,
    borderRadius: 7, backgroundColor: colores.azulSuave, paddingHorizontal: 6, paddingVertical: 2,
  },
  colorLista: { width: 9, height: 9, borderRadius: 4.5, borderWidth: 1, borderColor: '#8293AC' },
  numeroLista: { color: colores.azul, fontWeight: '800', fontSize: 13, flexShrink: 1 },
  simulacion: { color: colores.secundario, fontSize: 12 },
  control: { gap: 3 },
  controlCorto: { width: 171 },
  etiquetaVotos: { color: colores.secundario, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  ajustes: { flexDirection: 'row', alignItems: 'stretch', gap: 4 },
  ajuste: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1 },
  restar: { backgroundColor: '#B71835', borderColor: '#9A1430' },
  sumar: { backgroundColor: '#187346', borderColor: '#13623C' },
  ajusteDeshabilitado: { backgroundColor: '#F9E7EC', borderColor: '#E9BAC5' },
  ajustePresionado: { opacity: 0.76 },
  signo: { fontSize: 25, fontWeight: '900', color: colores.blanco },
  signoDeshabilitado: { color: colores.error },
  cantidad: {
    flexGrow: 1, flexShrink: 1, minWidth: 42, minHeight: 48, borderRadius: 10, borderWidth: 1.5, borderColor: colores.borde,
    backgroundColor: colores.blanco, color: colores.azul, fontSize: 22, fontWeight: '800', textAlign: 'center',
    fontVariant: ['tabular-nums'], paddingVertical: 5, paddingHorizontal: 4,
  },
  cantidadFoco: { borderColor: colores.azulBrillante },
  cantidadError: { backgroundColor: colores.rojoSuave, borderColor: colores.error },
  error: { color: colores.error, fontSize: 14, lineHeight: 19 },
  resumen: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  casilla: { gap: 6, flexBasis: 125, flexGrow: 1, padding: 8, borderWidth: 1, borderRadius: 12, borderColor: colores.linea },
  cabeceraCasilla: { flexDirection: 'row', gap: 5, alignItems: 'center', minHeight: 36 },
  etiquetaCasilla: { color: colores.azul, fontWeight: '800', fontSize: 14, flex: 1 },
  blancos: { backgroundColor: '#EAF2FF', borderColor: '#AABFDF' },
  nulos: { backgroundColor: '#FFF0F2', borderColor: '#E3AAB7' },
  sufragantes: { backgroundColor: '#FFF4CA', borderColor: '#DDC16B' },
  total: { backgroundColor: '#FFF4CA', borderColor: '#DDC16B' },
  totalNumero: {
    minHeight: 48, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4,
    backgroundColor: '#FFE899', color: colores.azul, fontWeight: '900', fontSize: 23,
    textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accion: { flexGrow: 1, flexBasis: 143 },
  botonAccion: { flexGrow: 1 },
});
