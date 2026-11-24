begin;

create table privado.altas_pendientes (
    token uuid primary key default gen_random_uuid(),
    superior_id uuid not null references public.perfiles(usuario_id),
    sesion_id uuid not null,
    rol_codigo text not null references public.roles(codigo),
    provincia_id bigint not null references public.provincias,
    recinto_id bigint references public.recintos,
    cedula text not null check (privado.cedula_valida(cedula)),
    nombres text not null,
    apellidos text not null,
    telefono text not null,
    correo text not null,
    expira_en timestamptz not null default (now() + interval '2 minutes')
);

create table privado.cambios_de_clave (
    usuario_id uuid primary key references public.perfiles(usuario_id),
    token uuid not null unique default gen_random_uuid(),
    actor_id uuid not null references public.perfiles(usuario_id),
    sesion_id uuid not null,
    asistido boolean not null,
    huella_previa bytea,
    confirma_correo boolean not null,
    expira_en timestamptz not null default (now() + interval '2 minutes')
);

create function public.preparar_alta_usuario(
    p_actor_id uuid, p_sesion_id uuid, p_rol text, p_recinto_id bigint,
    p_cedula text, p_nombres text, p_apellidos text, p_telefono text, p_correo text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    actor public.perfiles := privado.perfil_operativo(p_actor_id, p_sesion_id);
    correo_normalizado text := lower(btrim(p_correo));
    token_alta uuid;
begin
    if not privado.puede_administrar_rol(actor, p_rol, actor.provincia_id, p_recinto_id) then
        raise exception 'No tiene autorización para dar de alta este perfil.' using errcode = '42501';
    end if;

    if (p_rol = 'veedor') is distinct from (p_recinto_id is not null)
       or (p_recinto_id is not null and not exists (
           select 1 from privado.territorio_recinto(p_recinto_id) t
           where t.provincia_id = actor.provincia_id
       ))
       or not coalesce(privado.cedula_valida(p_cedula), false)
       or not coalesce(char_length(btrim(p_nombres)) between 1 and 120, false)
       or not coalesce(char_length(btrim(p_apellidos)) between 1 and 120, false)
       or not coalesce(p_telefono ~ '^\+?[0-9]{7,15}$', false)
       or not coalesce(char_length(correo_normalizado) <= 254
           and correo_normalizado ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$', false) then
        raise exception 'Revise los datos obligatorios y el recinto del usuario.' using errcode = '22023';
    end if;

    if exists (
        select 1 from public.perfiles p where p.cedula = p_cedula or p.correo = correo_normalizado
    ) then
        raise exception 'Ya existe una cuenta con esos datos.' using errcode = '23505';
    end if;

    delete from privado.altas_pendientes where expira_en <= clock_timestamp();
    insert into privado.altas_pendientes (
        superior_id, sesion_id, rol_codigo, provincia_id, recinto_id, cedula,
        nombres, apellidos, telefono, correo
    )
    values (
        p_actor_id, p_sesion_id, p_rol, actor.provincia_id, p_recinto_id, p_cedula,
        btrim(p_nombres), btrim(p_apellidos), p_telefono, correo_normalizado
    )
    returning token into token_alta;

    return token_alta;
end;
$$;

create function public.preparar_cambio_de_clave(
    p_actor_id uuid, p_sesion_id uuid, p_usuario_id uuid, p_otp_reciente boolean
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
    objetivo public.perfiles;
    es_asistido boolean := p_actor_id is distinct from p_usuario_id;
    huella bytea;
    token_cambio uuid;
begin
    select * into objetivo from public.perfiles where usuario_id = p_usuario_id;
    if not found or not objetivo.activo then
        raise exception 'La cuenta no está habilitada para cambiar la clave.' using errcode = '42501';
    end if;

    if es_asistido then
        if not privado.puede_administrar_rol(
            privado.perfil_operativo(p_actor_id, p_sesion_id),
            objetivo.rol_codigo, objetivo.provincia_id, objetivo.recinto_base_id
        ) then
            raise exception 'Solo su superior puede restablecer la clave.' using errcode = '42501';
        end if;
    elsif not privado.sesion_valida(p_actor_id, p_sesion_id)
          or not objetivo.cambio_clave_pendiente
          or (objetivo.correo_verificado_en is null and p_otp_reciente is distinct from true) then
        raise exception 'Inicie sesión y verifique el correo antes de cambiar la clave temporal.'
            using errcode = '42501';
    end if;

    select sha256(convert_to(u.encrypted_password, 'UTF8')) into huella
    from auth.users u where u.id = p_usuario_id and lower(u.email) = objetivo.correo;
    if not found then
        raise exception 'El correo de Auth no coincide con el perfil.' using errcode = '42501';
    end if;

    insert into privado.cambios_de_clave (
        usuario_id, actor_id, sesion_id, asistido, huella_previa, confirma_correo
    )
    values (
        p_usuario_id, p_actor_id, p_sesion_id, es_asistido, huella,
        not es_asistido and objetivo.correo_verificado_en is null
    )
    on conflict (usuario_id) do update
    set token = excluded.token, actor_id = excluded.actor_id, sesion_id = excluded.sesion_id,
        asistido = excluded.asistido, huella_previa = excluded.huella_previa,
        confirma_correo = excluded.confirma_correo, expira_en = excluded.expira_en
    where privado.cambios_de_clave.expira_en <= clock_timestamp()
    returning token into token_cambio;

    if token_cambio is null then
        raise exception 'Ya hay un cambio de clave en proceso.' using errcode = '55P03';
    end if;
    return token_cambio;
end;
$$;

create function public.cancelar_cambio_de_clave(p_token uuid)
returns void
language sql security definer set search_path = ''
as $$
    delete from privado.cambios_de_clave where token = p_token;
$$;

create function privado.procesar_operacion_auth()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
    alta privado.altas_pendientes;
    cambio privado.cambios_de_clave;
    objetivo public.perfiles;
begin
    if new.raw_app_meta_data->>'alta_electoral' is not null
       and (tg_op = 'INSERT' or
           new.raw_app_meta_data->>'alta_electoral' is distinct from old.raw_app_meta_data->>'alta_electoral') then
        delete from privado.altas_pendientes
        where token = (new.raw_app_meta_data->>'alta_electoral')::uuid
          and expira_en > clock_timestamp() and correo = lower(new.email)
        returning * into alta;

        if not found or not privado.puede_administrar_rol(
            privado.perfil_operativo(alta.superior_id, alta.sesion_id),
            alta.rol_codigo, alta.provincia_id, alta.recinto_id
        ) then
            raise exception 'La autorización para crear la cuenta ya no es válida.' using errcode = '42501';
        end if;

        insert into public.usuarios (id, creado_por) values (new.id, alta.superior_id);
        insert into public.perfiles (
            usuario_id, rol_codigo, provincia_id, recinto_base_id,
            cedula, nombres, apellidos, telefono, correo
        )
        values (
            new.id, alta.rol_codigo, alta.provincia_id, alta.recinto_id,
            alta.cedula, alta.nombres, alta.apellidos, alta.telefono, alta.correo
        );
    end if;

    if tg_op = 'UPDATE' and new.raw_app_meta_data->>'clave_electoral' is not null
       and new.raw_app_meta_data->>'clave_electoral' is distinct from old.raw_app_meta_data->>'clave_electoral' then
        delete from privado.cambios_de_clave
        where usuario_id = new.id and token = (new.raw_app_meta_data->>'clave_electoral')::uuid
          and expira_en > clock_timestamp()
        returning * into cambio;

        if not found or coalesce(new.encrypted_password, '') = ''
           or sha256(convert_to(new.encrypted_password, 'UTF8')) is not distinct from cambio.huella_previa then
            raise exception 'El cambio de clave no pudo comprobarse.' using errcode = '42501';
        end if;

        select * into objetivo from public.perfiles where usuario_id = new.id for no key update;
        if not objetivo.activo or lower(new.email) is distinct from objetivo.correo
           or (cambio.asistido and not privado.puede_administrar_rol(
               privado.perfil_operativo(cambio.actor_id, cambio.sesion_id),
               objetivo.rol_codigo, objetivo.provincia_id, objetivo.recinto_base_id
           ))
           or (not cambio.asistido and not privado.sesion_valida(cambio.actor_id, cambio.sesion_id)) then
            raise exception 'La autorización del cambio de clave ya no es válida.' using errcode = '42501';
        end if;

        update public.perfiles
        set cambio_clave_pendiente = cambio.asistido,
            correo_verificado_en = case when cambio.confirma_correo then clock_timestamp()
                                       else correo_verificado_en end
        where usuario_id = new.id;
    end if;

    return null;
end;
$$;

-- Auth crea la fila y aplica app_metadata dentro de su transacción de alta.
create trigger procesar_alta_o_clave_electoral
after insert or update of raw_app_meta_data on auth.users
for each row execute function privado.procesar_operacion_auth();

create function privado.proteger_identidad_del_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
    if (lower(new.email) is distinct from lower(old.email) or new.phone is distinct from old.phone) and exists (
        select 1 from public.perfiles where usuario_id = old.id
    ) then
        raise exception 'El correo y el teléfono de Auth se gestionan por el superior.'
            using errcode = '42501';
    end if;
    return new;
end;
$$;

create trigger proteger_identidad_electoral before update of email, phone on auth.users
for each row execute function privado.proteger_identidad_del_perfil();

create function public.cambiar_estado_cuenta(p_usuario_id uuid, p_activo boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
    objetivo public.perfiles;
begin
    select * into objetivo from public.perfiles where usuario_id = p_usuario_id for no key update;
    if not found or p_activo is null or not privado.puede_administrar_rol(
        privado.perfil_actual(), objetivo.rol_codigo, objetivo.provincia_id, objetivo.recinto_base_id
    ) then
        raise exception 'Solo su superior puede habilitar o desactivar la cuenta.' using errcode = '42501';
    end if;

    update public.perfiles set activo = p_activo where usuario_id = p_usuario_id;
end;
$$;

revoke execute on function privado.procesar_operacion_auth(), privado.proteger_identidad_del_perfil()
from public, anon, authenticated;

revoke execute on function
    public.preparar_alta_usuario(uuid, uuid, text, bigint, text, text, text, text, text),
    public.preparar_cambio_de_clave(uuid, uuid, uuid, boolean),
    public.cancelar_cambio_de_clave(uuid),
    public.cambiar_estado_cuenta(uuid, boolean)
from public, anon, authenticated;

grant execute on function
    public.preparar_alta_usuario(uuid, uuid, text, bigint, text, text, text, text, text),
    public.preparar_cambio_de_clave(uuid, uuid, uuid, boolean),
    public.cancelar_cambio_de_clave(uuid)
to service_role;

grant execute on function public.cambiar_estado_cuenta(uuid, boolean) to authenticated;

commit;
