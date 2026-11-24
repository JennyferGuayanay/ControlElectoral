begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('actas-evidencias', 'actas-evidencias', false, 8388608, array['image/jpeg'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function privado.ruta_evidencia(p_mesa_id bigint, p_dignidad text, p_acta_id uuid)
returns text
language sql immutable strict set search_path = ''
as $$
    select p_mesa_id::text || '/' || p_dignidad || '/' || p_acta_id::text || '.jpg';
$$;

create function privado.puede_subir_evidencia(p_ruta text, p_propietario text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_actual();
    mesa bigint;
begin
    if actor.rol_codigo is distinct from 'veedor'
       or p_propietario is distinct from actor.usuario_id::text
       or p_ruta !~ '^[1-9][0-9]{0,17}/(alcaldia|prefectura)/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$' then
        return false;
    end if;

    mesa := split_part(p_ruta, '/', 1)::bigint;
    return coalesce(privado.puede_ver_mesa(mesa), false) and not exists (
        select 1 from public.actas
        where mesa_id = mesa and dignidad_codigo = split_part(p_ruta, '/', 2)
    );
end;
$$;

create function privado.puede_leer_evidencia(p_ruta text)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.evidencias e
        join public.actas a on a.id = e.acta_id
        where e.ruta_foto = p_ruta and privado.puede_ver_mesa(a.mesa_id)
    );
$$;

create policy acto_foto_lectura on storage.objects for select to authenticated
using (bucket_id = 'actas-evidencias' and privado.puede_leer_evidencia(name));

create policy acto_foto_subida on storage.objects for insert to authenticated
with check (bucket_id = 'actas-evidencias' and privado.puede_subir_evidencia(name, owner_id));

-- Restringir este bucket aunque el proyecto ya tenga políticas generales de Storage.
create policy actas_fotos_sin_acceso_anonimo on storage.objects as restrictive for all to anon
using (bucket_id <> 'actas-evidencias') with check (bucket_id <> 'actas-evidencias');

create policy actas_fotos_limite_lectura on storage.objects as restrictive for select to authenticated
using (bucket_id <> 'actas-evidencias' or privado.puede_leer_evidencia(name));

create policy actas_fotos_limite_subida on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'actas-evidencias' or privado.puede_subir_evidencia(name, owner_id));

create policy actas_fotos_sin_cambios on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'actas-evidencias') with check (bucket_id <> 'actas-evidencias');

create policy actas_fotos_sin_borrado on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'actas-evidencias');

create function privado.bloquear_acta_enviada()
returns trigger
language plpgsql set search_path = ''
as $$
begin
    raise exception 'El acta enviada y su evidencia son definitivas.' using errcode = '55000';
end;
$$;

create trigger acta_definitiva before update or delete on public.actas
for each row execute function privado.bloquear_acta_enviada();
create trigger votos_definitivos before update or delete on public.votos
for each row execute function privado.bloquear_acta_enviada();
create trigger evidencia_definitiva before update or delete on public.evidencias
for each row execute function privado.bloquear_acta_enviada();

create function privado.validar_acta_completa()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    cantidad_votos bigint;
    suma_votos bigint;
    mayor_voto integer;
begin
    if not exists (
        select 1 from public.mesas m
        cross join lateral privado.territorio_recinto(m.recinto_id) t
        join public.contiendas c on c.id = new.contienda_id
        where m.id = new.mesa_id and c.provincia_id = t.provincia_id
          and (c.canton_id is null or c.canton_id = t.canton_id)
    ) then
        raise exception 'La contienda no corresponde al territorio de la mesa.' using errcode = '23514';
    end if;

    select count(*), coalesce(sum(cantidad), 0), max(cantidad)
    into cantidad_votos, suma_votos, mayor_voto from public.votos where acta_id = new.id;

    if cantidad_votos <> 5 or mayor_voto > new.total_sufragantes
       or suma_votos + new.votos_blancos + new.votos_nulos <> new.total_sufragantes then
        raise exception 'Registre cinco votos por candidatura y verifique el total con blancos y nulos.'
            using errcode = '23514';
    end if;

    if not exists (
        select 1 from public.evidencias e
        join storage.objects o on o.bucket_id = 'actas-evidencias' and o.name = e.ruta_foto
        where e.acta_id = new.id and e.capturada_en <= new.confirmada_en
          and e.ruta_foto = privado.ruta_evidencia(new.mesa_id, new.dignidad_codigo, new.id)
          and o.owner_id = new.autor_id::text
    ) then
        raise exception 'Falta la fotografía del autor o la evidencia de ubicación del acta.'
            using errcode = '23514';
    end if;
    return null;
end;
$$;

create constraint trigger validar_envio_completo after insert on public.actas
deferrable initially deferred for each row execute function privado.validar_acta_completa();

create function public.registrar_acta(
    p_acta_id uuid, p_mesa_id bigint, p_dignidad text, p_confirmada_en timestamptz,
    p_resultados jsonb, p_votos jsonb, p_evidencia jsonb
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_actual();
    contienda bigint;
    ruta text;
    acta_insertada uuid;
begin
    if actor.rol_codigo is distinct from 'veedor'
       or not coalesce(privado.puede_ver_mesa(p_mesa_id), false) then
        raise exception 'Solo el veedor vigente puede enviar el acta de esta mesa.' using errcode = '42501';
    end if;

    perform 1 from public.mesas where id = p_mesa_id for update;
    if not coalesce(privado.puede_ver_mesa(p_mesa_id), false) then
        raise exception 'Cambió la asignación de esta mesa.' using errcode = '42501';
    end if;

    if p_acta_id is null or p_dignidad is null or p_dignidad not in ('alcaldia', 'prefectura') then
        raise exception 'Indique el identificador y la dignidad del acta.' using errcode = '22023';
    end if;

    if exists (
        select 1 from public.actas where id = p_acta_id
          and mesa_id = p_mesa_id and dignidad_codigo = p_dignidad and autor_id = actor.usuario_id
    ) then
        return 'ya_registrada';
    end if;

    if exists (
        select 1 from public.actas
        where id = p_acta_id or (mesa_id = p_mesa_id and dignidad_codigo = p_dignidad)
    ) then
        return 'conflicto';
    end if;

    if jsonb_typeof(p_resultados) is distinct from 'object'
       or jsonb_typeof(p_votos) is distinct from 'array'
       or jsonb_typeof(p_evidencia) is distinct from 'object' then
        raise exception 'Indique los resultados, los votos y la evidencia con el formato esperado.'
            using errcode = '22023';
    end if;
    if jsonb_array_length(p_votos) <> 5 then
        raise exception 'El acta requiere cinco candidaturas.' using errcode = '23514';
    end if;

    select c.id into contienda from public.mesas m
    cross join lateral privado.territorio_recinto(m.recinto_id) t
    join public.contiendas c on c.provincia_id = t.provincia_id
    where m.id = p_mesa_id and c.dignidad_codigo = p_dignidad
      and (c.canton_id is null or c.canton_id = t.canton_id);
    if not found then
        raise exception 'No hay una contienda configurada para esta mesa.' using errcode = '22023';
    end if;

    ruta := privado.ruta_evidencia(p_mesa_id, p_dignidad, p_acta_id);
    if not exists (
        select 1 from storage.objects
        where bucket_id = 'actas-evidencias' and name = ruta and owner_id = actor.usuario_id::text
    ) then
        raise exception 'Suba primero la fotografía del acta.' using errcode = '23514';
    end if;

    insert into public.actas (
        id, mesa_id, contienda_id, dignidad_codigo, autor_id, total_sufragantes,
        votos_blancos, votos_nulos, numero_acta, codigo_control, confirmada_en
    )
    select p_acta_id, p_mesa_id, contienda, p_dignidad, actor.usuario_id, r.total_sufragantes,
           r.votos_blancos, r.votos_nulos, r.numero_acta, r.codigo_control, p_confirmada_en
    from jsonb_to_record(p_resultados) as r(
        total_sufragantes integer, votos_blancos integer, votos_nulos integer,
        numero_acta text, codigo_control text
    )
    on conflict do nothing
    returning id into acta_insertada;

    if acta_insertada is null then
        return 'conflicto';
    end if;

    insert into public.votos (acta_id, contienda_id, candidato_id, cantidad)
    select acta_insertada, contienda, v.candidato_id, v.cantidad
    from jsonb_to_recordset(p_votos) as v(candidato_id bigint, cantidad integer);

    insert into public.evidencias (
        acta_id, ruta_foto, latitud, longitud, precision_metros, ubicacion_simulada, capturada_en
    )
    select acta_insertada, ruta, e.latitud, e.longitud, e.precision_metros,
           e.ubicacion_simulada, e.capturada_en
    from jsonb_to_record(p_evidencia) as e(
        latitud double precision, longitud double precision, precision_metros double precision,
        ubicacion_simulada boolean, capturada_en timestamptz
    );

    return 'registrada';
end;
$$;

create function privado.provincia_del_tablero(p_recinto_id bigint)
returns bigint
language plpgsql stable security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_actual();
begin
    if actor.rol_codigo is distinct from 'provincial'
       or (p_recinto_id is not null and not coalesce(privado.puede_ver_recinto(p_recinto_id), false)) then
        raise exception 'El tablero está reservado al coordinador provincial de la jurisdicción.'
            using errcode = '42501';
    end if;
    return actor.provincia_id;
end;
$$;

create function public.avance_escrutinio(p_recinto_id bigint default null)
returns table (
    recinto_id bigint, recinto text, mesas bigint, completas bigint, parciales bigint, pendientes bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
    provincia_tablero bigint := privado.provincia_del_tablero(p_recinto_id);
begin
    return query
    with recintos_visibles as (
        select r.id, r.nombre
        from public.recintos r
        join public.parroquias pa on pa.id = r.parroquia_id
        join public.cantones ca on ca.id = pa.canton_id
        where ca.provincia_id = provincia_tablero and (p_recinto_id is null or r.id = p_recinto_id)
    ), actas_por_mesa as (
        select m.id, m.recinto_id, count(a.id) as actas
        from recintos_visibles r
        join public.mesas m on m.recinto_id = r.id
        left join public.actas a on a.mesa_id = m.id
        group by m.id, m.recinto_id
    )
    select r.id, r.nombre, count(m.id), count(m.id) filter (where m.actas = 2),
        count(m.id) filter (where m.actas = 1), count(m.id) filter (where m.actas = 0)
    from recintos_visibles r
    left join actas_por_mesa m on m.recinto_id = r.id
    group by r.id, r.nombre order by r.nombre, r.id;
end;
$$;

create function public.totales_escrutinio(p_recinto_id bigint default null)
returns table (
    contienda_id bigint, dignidad text, canton_id bigint, recinto_id bigint,
    candidato_id bigint, candidato text, organizacion text, color text,
    es_simulacion boolean, total_votos bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
    provincia_tablero bigint := privado.provincia_del_tablero(p_recinto_id);
begin
    return query
    with votos_recibidos as (
        select v.candidato_id, sum(v.cantidad) as total
        from public.actas a
        join public.contiendas c on c.id = a.contienda_id
        join public.mesas m on m.id = a.mesa_id
        join public.votos v on v.acta_id = a.id
        where c.provincia_id = provincia_tablero and (p_recinto_id is null or m.recinto_id = p_recinto_id)
        group by v.candidato_id
    )
    select c.id, c.dignidad_codigo, c.canton_id, p_recinto_id, ca.id, ca.nombre,
           o.nombre, o.color, ca.es_simulacion or o.es_simulacion, coalesce(v.total, 0)
    from public.contiendas c
    join public.candidatos ca on ca.contienda_id = c.id
    join public.organizaciones_politicas o on o.id = ca.organizacion_id
    left join votos_recibidos v on v.candidato_id = ca.id
    where c.provincia_id = provincia_tablero
      and (p_recinto_id is null or c.canton_id is null or c.canton_id =
          (select t.canton_id from privado.territorio_recinto(p_recinto_id) t))
    order by c.dignidad_codigo, c.id, ca.orden;
end;
$$;

alter publication supabase_realtime add table public.actas;

revoke execute on function
    privado.ruta_evidencia(bigint, text, uuid), privado.puede_leer_evidencia(text),
    privado.puede_subir_evidencia(text, text), privado.validar_acta_completa(),
    privado.bloquear_acta_enviada(), privado.provincia_del_tablero(bigint)
from public, anon, authenticated;
grant execute on function
    privado.puede_leer_evidencia(text), privado.puede_subir_evidencia(text, text)
to authenticated;

revoke execute on function
    public.registrar_acta(uuid, bigint, text, timestamptz, jsonb, jsonb, jsonb),
    public.avance_escrutinio(bigint), public.totales_escrutinio(bigint)
from public, anon, authenticated;
grant execute on function
    public.registrar_acta(uuid, bigint, text, timestamptz, jsonb, jsonb, jsonb),
    public.avance_escrutinio(bigint), public.totales_escrutinio(bigint)
to authenticated;

commit;
