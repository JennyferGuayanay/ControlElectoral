# Control Electoral

Aplicación móvil de escrutinio con Expo SDK 57, TypeScript y Clean Architecture. Las decisiones consensuadas están en [AGENTS.md](AGENTS.md).

## Desarrollo y verificación

```sh
npm ci
npx expo start --dev-client
npx expo lint
npx tsc --noEmit
npx expo install --check
npx expo-doctor
```

`src/app` contiene las rutas. Cada módulo en `src/modulos` reserva sus capas de dominio, aplicación, infraestructura y presentación. La [guía de Supabase](supabase/README.md) documenta las migraciones, la precarga y el despliegue de las Edge Functions.

## Compilación Android

Vincula el repositorio con el proyecto de Expo mediante `npx eas-cli@latest init`. El perfil `development` genera un cliente de desarrollo y el perfil `apk` genera la aplicación instalable.

```sh
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform android --profile apk
```

## Monitoreo y prueba de defensa

El plugin de Expo apunta al proyecto `jennyfer-6k/control-electoral`. Metro incorpora los identificadores de depuración que Sentry usa para localizar los mapas de código fuente. El DSN público se lee de `EXPO_PUBLIC_SENTRY_DSN` en `.env` para desarrollo y del entorno `preview` de EAS para el APK. Para subir los mapas en la compilación, guarda un token de CI de Sentry como variable **Secret** `SENTRY_AUTH_TOKEN` del mismo entorno de EAS. Usa el prefijo `EXPO_PUBLIC_` solo para variables destinadas a la aplicación.

En Android, el SDK nativo usa una cola persistente de hasta 30 sobres y reintenta el envío tras recuperar la conexión. El filtro de JavaScript conserva la pila, pantalla, rol y metadatos técnicos. La aplicación usa un identificador aleatorio de instalación para correlacionar informes, independiente de las cuentas de Supabase. En Sentry se descartan las direcciones IP, los mensajes originales de las excepciones y los archivos de volcado.

```sh
npx eas-cli@latest build --platform android --profile defensa
```

1. Instala el APK del perfil `defensa`. Ingresa como coordinador provincial y abre **Diagnóstico de Sentry**.
2. Pulsa **Registrar error controlado** y copia el identificador. En **Issues**, filtra por entorno `defensa` y por `operacion:prueba-defensa` para ver el incidente **PruebaDefensa**. Revisa la etiqueta `pantalla`, el modelo del dispositivo, la versión de Android y la línea de TypeScript en la pila.
3. Para probar la cola, vuelve al diagnóstico, activa el modo avión y genera otro evento. Apunta su identificador, recupera la conexión y busca ese evento en Sentry. Si hace falta, vuelve a abrir la aplicación.
4. Para el fallo fatal, pulsa **Preparar prueba fatal nativa** y confirma. Vuelve a abrir la aplicación y verifica el evento nativo en Sentry.

El perfil `apk` deja el diagnóstico desactivado.
