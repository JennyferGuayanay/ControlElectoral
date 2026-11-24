import { useForm } from '@tanstack/react-form';

import { esquemaCodigo, esquemaNuevaClave } from '../dominio/acceso';
import { Boton, Campo, errorDeCampo } from './interfaz';

export function FormularioCodigo({
  verificar, bloqueado,
}: { verificar(codigo: string): Promise<void>; bloqueado?: boolean }) {
  const formulario = useForm({
    defaultValues: { codigo: '' },
    validators: { onChange: esquemaCodigo, onSubmit: esquemaCodigo },
    onSubmit: ({ value }) => verificar(value.codigo),
  });

  return (
    <>
      <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
        {(verificando) => (
          <>
            <formulario.Field name="codigo">
              {(campo) => (
                <Campo
                  etiqueta="Código de verificación"
                  value={campo.state.value}
                  onBlur={campo.handleBlur}
                  onChangeText={(texto) => campo.handleChange(texto.replace(/[^0-9]/g, '').slice(0, 10))}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={10}
                  editable={!verificando && !bloqueado}
                  returnKeyType="done"
                  onSubmitEditing={() => { if (!bloqueado) void formulario.handleSubmit(); }}
                  error={errorDeCampo(campo.state.meta.errors)}
                />
              )}
            </formulario.Field>
            <Boton
              titulo="Verificar código"
              tituloCarga="Verificando…"
              cargando={verificando}
              deshabilitado={bloqueado}
              alPulsar={() => void formulario.handleSubmit()}
            />
          </>
        )}
      </formulario.Subscribe>
    </>
  );
}

export function FormularioClave({ guardar }: { guardar(clave: string): Promise<void> }) {
  const formulario = useForm({
    defaultValues: { clave: '', confirmacion: '' },
    validators: { onChange: esquemaNuevaClave, onSubmit: esquemaNuevaClave },
    onSubmit: ({ value }) => guardar(value.clave),
  });

  return (
    <formulario.Subscribe selector={(estado) => estado.isSubmitting}>
      {(guardando) => (
        <>
          <formulario.Field name="clave">
            {(campo) => (
              <Campo
                etiqueta="Nueva contraseña"
                value={campo.state.value}
                onBlur={campo.handleBlur}
                onChangeText={campo.handleChange}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!guardando}
                esClave
                error={errorDeCampo(campo.state.meta.errors)}
              />
            )}
          </formulario.Field>
          <formulario.Field name="confirmacion">
            {(campo) => (
              <Campo
                etiqueta="Repite la nueva contraseña"
                value={campo.state.value}
                onBlur={campo.handleBlur}
                onChangeText={campo.handleChange}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!guardando}
                returnKeyType="done"
                onSubmitEditing={() => void formulario.handleSubmit()}
                esClave
                error={errorDeCampo(campo.state.meta.errors)}
              />
            )}
          </formulario.Field>
          <Boton
            titulo="Guardar contraseña"
            tituloCarga="Guardando…"
            cargando={guardando}
            alPulsar={() => void formulario.handleSubmit()}
          />
        </>
      )}
    </formulario.Subscribe>
  );
}
