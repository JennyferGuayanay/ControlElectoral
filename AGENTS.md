This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Línea base obligatoria de Control Electoral

El archivo `documentos/Documento_Consolidado_ADR_Guayanay_Fabara_Narvaez.pdf` fija los 18 RF, 12 RNF, 8 supuestos y las 18 decisiones de esta lista. Para implementar un flujo, revisar en el PDF el requerimiento y los supuestos vinculados. Registrar las dudas y pedir autorización antes de cambiar una decisión o sustituir una librería acordada.

1. **ADR-01 · Alta por el superior.** Desactivar el registro público en Supabase Auth. Crear cuentas con una Edge Function que verifique la jerarquía y use la Admin API. La llave `service_role` queda en el servidor.
2. **ADR-02 · Habilitación.** Permitir el acceso a cuentas habilitadas y verificar el estado activo en las políticas RLS de PostgreSQL.
3. **ADR-03 · Clave temporal.** Exigir su cambio en el primer ingreso y bloquear en RLS el acceso electoral mientras la bandera esté pendiente. El servidor controla el cambio de la bandera.
4. **ADR-04 · Perfil obligatorio.** Usar TanStack Form y Zod para cédula, nombres, apellidos, teléfono y correo, con restricciones de integridad en PostgreSQL.
5. **ADR-05 · Cédula y correo.** Validar el dígito de la cédula con módulo 10 y aplicar `CHECK` y `UNIQUE` en PostgreSQL. RF-05 también exige comprobar el correo. El ADR deja abierto el flujo específico de confirmación.
6. **ADR-06 · Recuperación.** Usar Supabase Auth con OTP por correo. Permitir el restablecimiento asistido por el superior y exigir cambio de la nueva clave temporal al reingresar. El texto del ADR menciona tanto enlace como código OTP.
7. **ADR-07 · Territorio.** Normalizar cantón, parroquia, recinto y mesa en PostgreSQL. Precargar por SQL/CSV y permitir al coordinador provincial consultar y agregar recintos de su jurisdicción.
8. **ADR-08 · Coordinación.** Conservar el historial en una tabla de coordinaciones con vigencia, índice único parcial por recinto y reasignación transaccional.
9. **ADR-09 · Asignaciones.** Usar una tabla con vigencia e índices únicos parciales por mesa y por veedor. Permitir asignar antes o durante la jornada y mantener una sola asignación vigente por mesa y veedor.
10. **ADR-10 · Reemplazos.** Usar una RPC SQL transaccional para reemplazar al ausente por un veedor disponible del mismo recinto. Preservar autoría previa y recalcular el acceso según la asignación vigente.
11. **ADR-11 · Actas.** Usar Supabase como backend. Precargar cinco organizaciones y sus candidatos por dignidad. Registrar mediante `registrar_acta` el acta y sus votos en una transacción, con claves foráneas, `CHECK` y unicidad por mesa y dignidad. Cada mesa reporta alcaldía y prefectura.
12. **ADR-12 · Validación del acta.** Usar TanStack Form, Zod y restricciones en PostgreSQL. Validar al escribir, incluso sin conexión, con mensajes en español. Los votos por organización, blancos y nulos deben sumar el total de sufragantes y cada valor debe estar entre cero y el total.
13. **ADR-13 · Evidencia.** Usar VisionCamera, Expo Location, Supabase Storage privado y MapLibre. Capturar con guía y enfoque, exigir vista previa, comprimir la foto y guardar coordenadas, precisión e indicador de ubicación simulada. Aplicar permisos por mesa y recinto.
14. **ADR-14 · Envío definitivo.** Mostrar el resumen antes de confirmar y bloquear edición y borrado del acta confirmada. Aplicar el bloqueo local incluso sin conexión, y en PostgreSQL mediante RLS y trigger.
15. **ADR-15 · Cola sin conexión.** Usar Expo SQLite, Expo FileSystem, NetInfo y un UUID estable por acta. Mantener estados visibles y reintentar al reconectar. Usar unicidad por mesa y dignidad e `INSERT ... ON CONFLICT DO NOTHING`. Informar conflictos. TanStack Query se usa para consultas al servidor.
16. **ADR-16 · Acceso por rol.** Aplicar RLS en datos, fotos y eventos según rol y asignación vigente. Usar grupos de Expo Router y `Stack.Protected` para la navegación, incluidos enlaces directos.
17. **ADR-17 · Seguimiento.** Usar Supabase Realtime, agregaciones SQL y Victory Native XL con Skia y Reanimated. Mostrar avance y conteo preliminar por recinto y global, con colores de organizaciones y actualización al reconectar.
18. **ADR-18 · Monitoreo.** Usar Sentry para fallos nativos, JavaScript y errores controlados, incluso cuando se produzcan sin conexión. Configurar source maps, contexto de pantalla, dispositivo y versión, sin enviar cédulas ni votos.

Usar Clean Architecture por módulo. Mantener pantallas y layouts en `src/app`, reglas en `dominio`, casos de uso en `aplicacion` y adaptadores en `infraestructura`. La capa `presentacion` conecta las pantallas con los casos de uso. Usar nombres y comentarios en español cuando sea posible. El examen exige Lottie y Reanimated para la retroalimentación visual y un APK instalable en Android.
