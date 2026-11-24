begin;

create function privado.sesion_valida(p_usuario_id uuid, p_sesion_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1
        from auth.sessions s
        join auth.users u on u.id = s.user_id
        where s.id = p_sesion_id and s.user_id = p_usuario_id
          and (s.not_after is null or s.not_after > now())
          and (u.banned_until is null or u.banned_until <= now())
    );
$$;

create function privado.sesion_actual()
returns boolean
language sql stable security definer set search_path = ''
as $$
    select privado.sesion_valida(auth.uid(), (auth.jwt()->>'session_id')::uuid);
$$;

create function privado.perfil_operativo(p_usuario_id uuid, p_sesion_id uuid)
returns public.perfiles
language sql stable security definer set search_path = ''
as $$
    select p.*
    from public.perfiles p
    join auth.users u on u.id = p.usuario_id
    where p.usuario_id = p_usuario_id and p.activo and not p.cambio_clave_pendiente
      and p.correo_verificado_en is not null and lower(u.email) = p.correo
      and privado.sesion_valida(p_usuario_id, p_sesion_id);
$$;

create function privado.perfil_actual()
returns public.perfiles
language sql stable security definer set search_path = ''
as $$
    select privado.perfil_operativo(auth.uid(), (auth.jwt()->>'session_id')::uuid);
$$;

create function privado.territorio_recinto(p_recinto_id bigint)
returns table (provincia_id bigint, canton_id bigint)
language sql stable security definer set search_path = ''
as $$
    select c.provincia_id, c.id
    from public.recintos r
    join public.parroquias p on p.id = r.parroquia_id
    join public.cantones c on c.id = p.canton_id
    where r.id = p_recinto_id;
$$;

create function privado.coordina_recinto(p_usuario_id uuid, p_recinto_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.coordinaciones
        where coordinador_id = p_usuario_id and recinto_id = p_recinto_id and hasta is null
    );
$$;

create function privado.puede_administrar_rol(
    p_superior public.perfiles, p_rol text, p_provincia_id bigint, p_recinto_id bigint
)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select coalesce(
        p_superior.provincia_id = p_provincia_id
        and (
            (p_superior.rol_codigo = 'provincial' and p_rol in ('recinto', 'veedor'))
            or (p_superior.rol_codigo = 'recinto' and p_rol = 'veedor'
                and privado.coordina_recinto(p_superior.usuario_id, p_recinto_id))
        ),
        false
    );
$$;

create function privado.puede_ver_perfil(
    p_usuario_id uuid, p_activo boolean, p_rol text, p_provincia_id bigint, p_recinto_id bigint
)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select coalesce(p_usuario_id = auth.uid() and p_activo and privado.sesion_actual(), false)
        or privado.puede_administrar_rol(privado.perfil_actual(), p_rol, p_provincia_id, p_recinto_id);
$$;

create function privado.puede_ver_provincia(p_provincia_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select (privado.perfil_actual()).provincia_id = p_provincia_id;
$$;

create function privado.puede_ver_recinto(p_recinto_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select case p.rol_codigo
        when 'provincial' then p.provincia_id = t.provincia_id
        when 'recinto' then privado.coordina_recinto(p.usuario_id, p_recinto_id)
        when 'veedor' then exists (
            select 1 from public.asignaciones a
            join public.mesas m on m.id = a.mesa_id
            where a.veedor_id = p.usuario_id and a.hasta is null and m.recinto_id = p_recinto_id
        )
        else false
    end
    from privado.perfil_actual() p
    cross join privado.territorio_recinto(p_recinto_id) t;
$$;

create function privado.puede_ver_mesa(p_mesa_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select case p.rol_codigo
        when 'veedor' then exists (
            select 1 from public.asignaciones
            where mesa_id = p_mesa_id and veedor_id = p.usuario_id and hasta is null
        )
        when 'provincial' then privado.puede_ver_recinto(m.recinto_id)
        when 'recinto' then privado.coordina_recinto(p.usuario_id, m.recinto_id)
        else false
    end
    from privado.perfil_actual() p
    cross join public.mesas m
    where m.id = p_mesa_id;
$$;

create function privado.puede_ver_parroquia(p_parroquia_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select case when p.rol_codigo = 'provincial' then
        exists (
            select 1 from public.parroquias pa
            join public.cantones c on c.id = pa.canton_id
            where pa.id = p_parroquia_id and c.provincia_id = p.provincia_id
        )
    else
        exists (
            select 1 from public.recintos r
            where r.parroquia_id = p_parroquia_id and privado.puede_ver_recinto(r.id)
        )
    end
    from privado.perfil_actual() p;
$$;

create function privado.puede_ver_canton(p_canton_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select case when p.rol_codigo = 'provincial' then
        exists (
            select 1 from public.cantones c
            where c.id = p_canton_id and c.provincia_id = p.provincia_id
        )
    else
        exists (
            select 1 from public.parroquias pa
            where pa.canton_id = p_canton_id and privado.puede_ver_parroquia(pa.id)
        )
    end
    from privado.perfil_actual() p;
$$;

create function privado.puede_ver_contienda(p_provincia_id bigint, p_canton_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select privado.puede_ver_provincia(p_provincia_id)
       and case when p_canton_id is not null then privado.puede_ver_canton(p_canton_id)
           else (privado.perfil_actual()).rol_codigo = 'provincial'
                or exists (
                    select 1 from public.cantones c
                    where c.provincia_id = p_provincia_id and privado.puede_ver_canton(c.id)
                )
           end;
$$;

create function privado.es_superior_recinto(p_recinto_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select p.rol_codigo in ('provincial', 'recinto') and privado.puede_ver_recinto(p_recinto_id)
    from privado.perfil_actual() p;
$$;

create function privado.puede_ver_asignacion(p_mesa_id bigint, p_veedor_id uuid, p_hasta timestamptz)
returns boolean
language sql stable security definer set search_path = ''
as $$
    select privado.puede_ver_mesa(p_mesa_id)
       and (p.rol_codigo in ('provincial', 'recinto') or (p_veedor_id = p.usuario_id and p_hasta is null))
    from privado.perfil_actual() p;
$$;

create policy perfil_por_jerarquia on public.perfiles for select to authenticated
using (privado.puede_ver_perfil(usuario_id, activo, rol_codigo, provincia_id, recinto_base_id));

create policy usuario_por_perfil on public.usuarios for select to authenticated
using (exists (select 1 from public.perfiles p where p.usuario_id = usuarios.id));

create policy roles_para_cuenta_activa on public.roles for select to authenticated
using (exists (select 1 from public.perfiles p where p.usuario_id = (select auth.uid())));

create policy provincia_por_jurisdiccion on public.provincias for select to authenticated
using (privado.puede_ver_provincia(id));

create policy canton_por_jurisdiccion on public.cantones for select to authenticated
using (privado.puede_ver_canton(id));

create policy parroquia_por_jurisdiccion on public.parroquias for select to authenticated
using (privado.puede_ver_parroquia(id));

create policy recinto_por_jurisdiccion on public.recintos for select to authenticated
using (privado.puede_ver_recinto(id));

create policy mesa_por_jurisdiccion on public.mesas for select to authenticated
using (privado.puede_ver_mesa(id));

create policy coordinacion_por_jurisdiccion on public.coordinaciones for select to authenticated
using (privado.es_superior_recinto(recinto_id));

create policy asignacion_por_jurisdiccion on public.asignaciones for select to authenticated
using (privado.puede_ver_asignacion(mesa_id, veedor_id, hasta));

create policy dignidad_para_cuenta_operativa on public.dignidades for select to authenticated
using (exists (select 1 from public.contiendas c where c.dignidad_codigo = codigo));

create policy contienda_por_jurisdiccion on public.contiendas for select to authenticated
using (privado.puede_ver_contienda(provincia_id, canton_id));

create policy candidato_por_contienda on public.candidatos for select to authenticated
using (exists (select 1 from public.contiendas c where c.id = contienda_id));

create policy organizacion_por_candidatura on public.organizaciones_politicas for select to authenticated
using (exists (select 1 from public.candidatos c where c.organizacion_id = organizaciones_politicas.id));

create policy acta_por_mesa on public.actas for select to authenticated
using (privado.puede_ver_mesa(mesa_id));

create policy votos_por_acta on public.votos for select to authenticated
using (exists (select 1 from public.actas a where a.id = acta_id));

create policy evidencia_por_acta on public.evidencias for select to authenticated
using (exists (select 1 from public.actas a where a.id = acta_id));

grant select on
    public.roles, public.usuarios, public.perfiles, public.provincias, public.cantones,
    public.parroquias, public.recintos, public.mesas, public.coordinaciones,
    public.asignaciones, public.dignidades, public.contiendas, public.organizaciones_politicas,
    public.candidatos, public.actas, public.votos, public.evidencias
to authenticated;

create function public.agregar_recinto(
    p_parroquia_id bigint, p_nombre text, p_zona text default '', p_direccion text default null
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_actual();
    nuevo_id bigint;
begin
    if actor.rol_codigo is distinct from 'provincial' or not exists (
        select 1 from public.parroquias p join public.cantones c on c.id = p.canton_id
        where p.id = p_parroquia_id and c.provincia_id = actor.provincia_id
    ) then
        raise exception 'La parroquia está fuera de su jurisdicción.' using errcode = '42501';
    end if;

    insert into public.recintos (parroquia_id, nombre, zona, direccion)
    values (p_parroquia_id, btrim(p_nombre), btrim(coalesce(p_zona, '')), nullif(btrim(p_direccion), ''))
    returning id into nuevo_id;
    return nuevo_id;
end;
$$;

create function public.agregar_mesa(p_recinto_id bigint, p_numero integer, p_sexo text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_actual();
    nueva_mesa_id bigint;
begin
    if actor.rol_codigo is distinct from 'provincial'
       or not coalesce(privado.puede_ver_recinto(p_recinto_id), false) then
        raise exception 'El recinto está fuera de su jurisdicción.' using errcode = '42501';
    end if;

    insert into public.mesas (recinto_id, numero, numero_jrv_cne, sexo)
    values (p_recinto_id, p_numero, p_numero, p_sexo)
    returning id into nueva_mesa_id;
    return nueva_mesa_id;
end;
$$;

create function public.coordinar_recinto(p_recinto_id bigint, p_coordinador_id uuid)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_actual();
    vigente public.coordinaciones;
    momento timestamptz;
    coordinacion_id bigint;
begin
    if actor.rol_codigo is distinct from 'provincial'
       or not coalesce(privado.puede_ver_recinto(p_recinto_id), false) then
        raise exception 'No tiene permiso para coordinar este recinto.' using errcode = '42501';
    end if;

    perform 1 from public.recintos where id = p_recinto_id for update;
    perform 1 from public.perfiles
    where usuario_id = p_coordinador_id and rol_codigo = 'recinto'
      and provincia_id = actor.provincia_id and activo for no key update;
    if not found then
        raise exception 'Elija un coordinador de recinto activo de su provincia.' using errcode = '22023';
    end if;

    select * into vigente from public.coordinaciones
    where recinto_id = p_recinto_id and hasta is null;
    if vigente.coordinador_id = p_coordinador_id then
        return vigente.id;
    end if;

    momento := clock_timestamp();
    update public.coordinaciones set hasta = momento where id = vigente.id;
    insert into public.coordinaciones (recinto_id, coordinador_id, asignado_por, desde)
    values (p_recinto_id, p_coordinador_id, actor.usuario_id, momento)
    returning id into coordinacion_id;
    return coordinacion_id;
end;
$$;

create function privado.cambiar_asignacion(
    p_mesa_id bigint, p_veedor_id uuid, p_asignacion_esperada_id bigint
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_actual();
    recinto_id_mesa bigint;
    vigente public.asignaciones;
    asignacion_id bigint;
    momento timestamptz;
begin
    select m.recinto_id into recinto_id_mesa from public.mesas m where m.id = p_mesa_id;
    if actor.rol_codigo is distinct from 'recinto'
       or not privado.coordina_recinto(actor.usuario_id, recinto_id_mesa) then
        raise exception 'Solo el coordinador vigente puede asignar esta mesa.' using errcode = '42501';
    end if;

    -- El cambio de coordinador y el registro de un acta usan los mismos bloqueos de territorio.
    perform 1 from public.recintos where id = recinto_id_mesa for share;
    perform 1 from public.mesas where id = p_mesa_id for update;
    if not privado.coordina_recinto(actor.usuario_id, recinto_id_mesa) then
        raise exception 'Cambió el responsable de este recinto.' using errcode = '42501';
    end if;

    select * into vigente from public.asignaciones where mesa_id = p_mesa_id and hasta is null;
    if vigente.id is distinct from p_asignacion_esperada_id then
        raise exception 'La asignación cambió. Consulte la mesa e intente de nuevo.' using errcode = '40001';
    end if;
    if vigente.veedor_id = p_veedor_id then
        return vigente.id;
    end if;

    perform 1 from public.perfiles
    where usuario_id = p_veedor_id and rol_codigo = 'veedor'
      and activo and recinto_base_id = recinto_id_mesa for no key update;
    if not found or exists (
        select 1 from public.asignaciones where veedor_id = p_veedor_id and hasta is null
    ) then
        raise exception 'Elija un veedor disponible del mismo recinto.' using errcode = '22023';
    end if;

    momento := clock_timestamp();
    update public.asignaciones set hasta = momento where id = vigente.id;
    insert into public.asignaciones (mesa_id, veedor_id, asignado_por, desde)
    values (p_mesa_id, p_veedor_id, actor.usuario_id, momento)
    returning id into asignacion_id;
    return asignacion_id;
end;
$$;

create function public.asignar_veedor(p_mesa_id bigint, p_veedor_id uuid)
returns bigint
language sql security definer set search_path = ''
as $$
    select privado.cambiar_asignacion(p_mesa_id, p_veedor_id, null);
$$;

create function public.reemplazar_veedor(
    p_mesa_id bigint, p_veedor_id uuid, p_asignacion_esperada_id bigint
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
begin
    if p_asignacion_esperada_id is null then
        raise exception 'Indique la asignación vigente que desea reemplazar.' using errcode = '22023';
    end if;
    return privado.cambiar_asignacion(p_mesa_id, p_veedor_id, p_asignacion_esperada_id);
end;
$$;

revoke execute on all functions in schema privado from public, anon, authenticated;
grant execute on function
    privado.puede_ver_perfil(uuid, boolean, text, bigint, bigint),
    privado.puede_ver_provincia(bigint), privado.puede_ver_parroquia(bigint),
    privado.puede_ver_canton(bigint), privado.puede_ver_recinto(bigint),
    privado.puede_ver_mesa(bigint), privado.puede_ver_contienda(bigint, bigint),
    privado.es_superior_recinto(bigint), privado.puede_ver_asignacion(bigint, uuid, timestamptz)
to authenticated;

revoke execute on function
    public.agregar_recinto(bigint, text, text, text), public.agregar_mesa(bigint, integer, text),
    public.coordinar_recinto(bigint, uuid), public.asignar_veedor(bigint, uuid),
    public.reemplazar_veedor(bigint, uuid, bigint)
from public, anon, authenticated;
grant execute on function
    public.agregar_recinto(bigint, text, text, text), public.agregar_mesa(bigint, integer, text),
    public.coordinar_recinto(bigint, uuid), public.asignar_veedor(bigint, uuid),
    public.reemplazar_veedor(bigint, uuid, bigint)
to authenticated;

commit;
