import { useForm } from '@tanstack/react-form';

import { Boton, Campo, errorDeCampo } from '@/modulos/acceso/presentacion/interfaz';
import { Tarjeta, Texto } from '@/modulos/operacion/presentacion/componentes';

import { esquemaFormulario, prepararValores, sumarVotos, type Candidato, type ValoresActa } from '../dominio/acta';
import { ListaCandidatura } from './lectura-acta';

const camposNumericos = [
  ['sufragantes', 'Total de sufragantes'], ['blancos', 'Votos blancos'], ['nulos', 'Votos nulos'],
] as const;

export function FormularioActa({ candidatos, inicial, guardar }: {
  candidatos: Candidato[]; inicial: ValoresActa;
  guardar(valores: ValoresActa, continuar: boolean): Promise<void>;
}) {
  const esquema = esquemaFormulario(candidatos);
  const formulario = useForm({
    defaultValues: prepararValores(candidatos, inicial),
    validators: { onChange: esquema, onSubmit: esquema },
    onSubmit: async ({ value }) => guardar(value, true),
  });

  return (
    <>
      <Tarjeta titulo="Identificación y totales">
        {([['numeroActa', 'Número de acta (opcional)'], ['codigoControl', 'Código de control (opcional)']] as const)
          .map(([name, etiqueta]) => (
            <formulario.Field key={name} name={name}>
              {(campo) => <Campo etiqueta={etiqueta} value={campo.state.value} onChangeText={campo.handleChange}
                onBlur={campo.handleBlur} error={errorDeCampo(campo.state.meta.errors)} />}
            </formulario.Field>
          ))}
        {camposNumericos.map(([name, etiqueta]) => (
          <formulario.Field key={name} name={name}>
            {(campo) => <Campo etiqueta={etiqueta} inputMode="numeric" value={campo.state.value}
              onChangeText={campo.handleChange} onBlur={campo.handleBlur} error={errorDeCampo(campo.state.meta.errors)} />}
          </formulario.Field>
        ))}
        <formulario.Subscribe selector={(estado) => estado.values}>
          {(valores) => (
            <Texto destacado>Suma ingresada: {sumarVotos(valores)} de {valores.sufragantes || '—'} sufragantes</Texto>
          )}
        </formulario.Subscribe>
      </Tarjeta>
      <Tarjeta titulo="Votos por candidatura">
        <Texto>Escribe 0 si una lista no obtuvo votos.</Texto>
        {candidatos.map((candidato, indice) => (
          <formulario.Field key={candidato.id} name={`votos[${indice}].cantidad` as const}>
            {(campo) => (
              <>
                <ListaCandidatura candidato={candidato} />
                <Campo etiqueta={`Votos de la lista ${candidato.lista}`} inputMode="numeric" value={campo.state.value}
                  onChangeText={campo.handleChange} onBlur={campo.handleBlur} error={errorDeCampo(campo.state.meta.errors)} />
              </>
            )}
          </formulario.Field>
        ))}
      </Tarjeta>
      <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
        {(guardando) => (
          <>
            <Boton titulo="Continuar a evidencia" cargando={guardando} alPulsar={() => void formulario.handleSubmit()} />
            <Boton titulo="Guardar borrador y salir" deshabilitado={guardando} variante="secundario"
              alPulsar={() => void guardar(formulario.state.values, false)} />
          </>
        )}
      </formulario.Subscribe>
    </>
  );
}
