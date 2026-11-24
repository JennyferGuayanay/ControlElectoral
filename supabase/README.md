# Base de datos de Control Electoral

## Orden en SQL Editor

Ejecuta el contenido completo de cada archivo en una consulta separada y en este orden. Las cuatro migraciones se ejecutan una vez sobre el esquema inicial de un proyecto Supabase. La precarga puede ejecutarse de nuevo.

1. [Esquema electoral](migrations/20261124000100_esquema_electoral.sql)
2. [Permisos, coordinaciones y asignaciones](migrations/20261124000200_permisos_y_asignaciones.sql)
3. [Actas, fotografías, Realtime y tablero](migrations/20261124000300_actas_evidencias_y_seguimiento.sql)
4. [Altas y recuperación de cuentas](migrations/20261124000400_acceso_y_recuperacion.sql)
5. [Precarga de Imbabura y Cotacachi](seed.sql)

```sql
select
    (select count(*) from public.parroquias) as parroquias,
    (select count(*) from public.recintos) as recintos,
    (select count(*) from public.mesas) as mesas,
    (select count(*) from public.candidatos) as candidatos;

select dignidad_codigo, count(ca.id) as candidaturas
from public.contiendas c
join public.candidatos ca on ca.contienda_id = c.id
group by dignidad_codigo
order by dignidad_codigo;
```

En un proyecto recién creado, la precarga deja 10 parroquias, 24 recintos, 140 registros de mesa y 5 candidaturas por dignidad.

## Procedencia de la precarga

Se tomó como referencia la elección seccional de febrero de 2023, que coincide con el modelo de acta del examen.

- Los **24 recintos** y los grupos de **71 juntas femeninas y 69 masculinas** proceden de las páginas 13 y 14 del informe logístico del CNE Imbabura. El informe da cantidades por recinto y sexo. `mesas.numero` es un ordinal por recinto y sexo y `mesas.numero_jrv_cne` queda vacío hasta cotejar la numeración individual. El reporte electoral de alcaldía indica 142 actas. La precarga conserva las 140 juntas atribuibles a un recinto en el informe logístico. [Informe logístico del CNE](https://delegaciones.cne.gob.ec/wp-content/uploads/2024/02/IMPLEMENTACION-DE-POLITICAS-PUBLICAS-DE-DISCAPACIDADES.pdf) · [Reporte de resultados de alcaldía](https://elnorte.ec/municipio-cotacachi-tiene-autoridades/)
- Los códigos territoriales corresponden a la codificación electoral del CNE. [Catastro de la Delegación Electoral de Imbabura](https://delegaciones.cne.gob.ec/wp-content/uploads/2022/02/3.-Participacion-ciudadana-catastros-recintos.pdf)
- Se cargaron las cinco candidaturas que aparecen en el reporte de resultados de alcaldía y las cinco listas más votadas de prefectura. El libro del CNE documenta las listas y resultados de prefectura en la página 31 y el alcalde electo en la página 52. La descarga nacional de candidaturas pidió verificación. Los nombres restantes se contrastaron con reportes de resultados y candidaturas. Las URL por fila están en `seed.sql`. Los colores son de la aplicación. [Libro estadístico del CNE](https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html) · [Descarga de candidaturas 2023 del CNE](https://www.cne.gob.ec/download/candidatos-2023/) · [Reporte de alcaldía](https://hoyenimbabura.com/2023/02/05/primeros-resultados-de-alcalde-alcaldesa-de-cotacachi/) · [Reporte de prefectura](https://www.expectativa.ec/richard-calderon-gano-con-84-244-votos-el-3433/) · [Binomios](https://www.expectativa.ec/en-imbabura-nueve-candidatas-a-viceprefectas-uno-a-viceprefecto/)

## Auth y Edge Functions

1. En el panel de Supabase, habilita el proveedor Email y desactiva el registro público, las cuentas anónimas y el acceso por teléfono. Configura SMTP y pon `{{ .Token }}` en las plantillas **Magic Link** y **Reset Password** para enviar códigos.
2. Despliega las funciones mediante Supabase CLI o el panel de Edge Functions. El CLI usa los ajustes de `config.toml`. Cada función valida el JWT firmado y el servidor vuelve a comprobar la sesión y la jerarquía. Las funciones leen sus credenciales del entorno de Supabase. La aplicación usa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` del `.env`.

```sh
npx supabase login
npx supabase functions deploy crear-cuenta restablecer-clave cambiar-clave-temporal --remote=REFERENCIA_DEL_PROYECTO --use-api
```

3. Crea el primer coordinador provincial en **Authentication → Users** con su correo, una contraseña temporal y la opción **Auto Confirm User**. Esa confirmación técnica permite el ingreso a Auth. Antes de operar, el titular acredita el correo con OTP y establece su clave definitiva. Luego reemplaza los cinco textos de ejemplo y ejecuta este bloque **una vez** en SQL Editor.

```sql
do $$
declare
    correo_provincial text := 'CORREO_DEL_TITULAR';
    cedula_provincial text := 'CEDULA_DEL_TITULAR';
    nombres_provincial text := 'NOMBRES_DEL_TITULAR';
    apellidos_provincial text := 'APELLIDOS_DEL_TITULAR';
    telefono_provincial text := 'TELEFONO_DEL_TITULAR';
    usuario_provincial uuid;
    provincia_provincial bigint;
begin
    select id into strict usuario_provincial
    from auth.users where lower(email) = lower(btrim(correo_provincial));

    select id into strict provincia_provincial from public.provincias where nombre = 'Imbabura';

    insert into public.usuarios (id) values (usuario_provincial);
    insert into public.perfiles (
        usuario_id, rol_codigo, provincia_id, cedula, nombres, apellidos, telefono, correo
    )
    values (
        usuario_provincial, 'provincial', provincia_provincial, cedula_provincial,
        nombres_provincial, apellidos_provincial, telefono_provincial, lower(btrim(correo_provincial))
    );
end;
$$;
```

El alta y la recuperación asistida devuelven una contraseña temporal al superior autorizado. Para el primer cambio, solicita el código con `signInWithOtp` y `shouldCreateUser: false`, verifica con `verifyOtp` de tipo `email` e invoca `cambiar-clave-temporal` con la sesión resultante y `clave_nueva`. Supabase valida la nueva contraseña y el servidor habilita el perfil después del cambio confirmado. Para recuperación autónoma usa `resetPasswordForEmail` y `verifyOtp` de tipo `recovery`. Si el cambio temporal está pendiente, usa la misma Edge Function. Si el perfil ya está habilitado, usa `updateUser`. [Plantillas de Auth](https://supabase.com/docs/guides/auth/auth-email-templates)

## Registro de actas

`registrar_acta` recibe el UUID local, la mesa, la dignidad, la hora de confirmación y tres objetos de datos:

- `p_resultados` contiene `total_sufragantes`, `votos_blancos` y `votos_nulos`. `numero_acta` y `codigo_control` son opcionales. Las firmas y demás marcas se conservan en la fotografía.
- `p_votos` es una lista de cinco pares `candidato_id` y `cantidad`. Para prefectura la candidatura representa al binomio.
- `p_evidencia` contiene `latitud`, `longitud`, `precision_metros`, `ubicacion_simulada` y `capturada_en`. Primero sube el JPEG al bucket privado `actas-evidencias` en la ruta `mesa_id/dignidad/uuid.jpg`, con un límite de 8 MiB. Reutiliza la ruta y el UUID en los reintentos.

La RPC devuelve `registrada`, `ya_registrada` o `conflicto`. Los borradores pertenecen a la cola local del ADR-15. El servidor guarda actas definitivas con votos y evidencia en una transacción. Para lecturas, usa una URL firmada de corta duración. El tablero provincial consulta `avance_escrutinio` y `totales_escrutinio` al recibir nuevos eventos de `actas`.
