begin;

create schema privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

create table public.roles (
    codigo text primary key check (codigo in ('provincial', 'recinto', 'veedor')),
    nombre text not null unique
);

insert into public.roles values
    ('provincial', 'Coordinador provincial'),
    ('recinto', 'Coordinador de recinto'),
    ('veedor', 'Veedor');

create table public.provincias (
    id bigint generated always as identity primary key,
    codigo_cne text unique,
    nombre text not null unique check (btrim(nombre) <> '')
);

create table public.cantones (
    id bigint generated always as identity primary key,
    provincia_id bigint not null references public.provincias,
    codigo_cne text,
    nombre text not null check (btrim(nombre) <> ''),
    unique (provincia_id, nombre),
    unique (provincia_id, codigo_cne),
    unique (id, provincia_id)
);

create table public.parroquias (
    id bigint generated always as identity primary key,
    canton_id bigint not null references public.cantones,
    codigo_cne text,
    nombre text not null check (btrim(nombre) <> ''),
    unique (canton_id, nombre),
    unique (canton_id, codigo_cne)
);

create table public.recintos (
    id bigint generated always as identity primary key,
    parroquia_id bigint not null references public.parroquias,
    codigo_cne text unique,
    zona text not null default '',
    nombre text not null check (btrim(nombre) <> ''),
    direccion text,
    fuente_url text,
    unique (parroquia_id, zona, nombre)
);

create table public.mesas (
    id bigint generated always as identity primary key,
    recinto_id bigint not null references public.recintos,
    numero integer not null check (numero > 0),
    numero_jrv_cne integer check (numero_jrv_cne > 0),
    sexo text not null check (sexo in ('F', 'M', 'X')),
    es_simulacion boolean not null default false,
    fuente_url text,
    unique (recinto_id, numero, sexo),
    unique (recinto_id, numero_jrv_cne, sexo)
);

create function privado.cedula_valida(p_cedula text)
returns boolean
language plpgsql immutable strict
set search_path = ''
as $$
declare
    suma integer := 0;
    digito integer;
begin
    if p_cedula !~ '^[0-9]{10}$'
       or substring(p_cedula, 1, 2) not in
           ('01','02','03','04','05','06','07','08','09','10','11','12','13',
            '14','15','16','17','18','19','20','21','22','23','24','30')
       or substring(p_cedula, 3, 1) not between '0' and '5' then
        return false;
    end if;

    for posicion in 1..9 loop
        digito := substring(p_cedula, posicion, 1)::integer;
        if posicion % 2 = 1 then
            digito := digito * 2;
            if digito > 9 then
                digito := digito - 9;
            end if;
        end if;
        suma := suma + digito;
    end loop;

    return (10 - suma % 10) % 10 = substring(p_cedula, 10, 1)::integer;
end;
$$;

create table public.usuarios (
    id uuid primary key references auth.users(id) on delete restrict,
    creado_por uuid references public.usuarios(id),
    creado_en timestamptz not null default now()
);

create table public.perfiles (
    usuario_id uuid primary key references public.usuarios(id),
    rol_codigo text not null references public.roles(codigo),
    provincia_id bigint not null references public.provincias,
    recinto_base_id bigint references public.recintos,
    cedula text not null unique check (privado.cedula_valida(cedula)),
    nombres text not null check (char_length(btrim(nombres)) between 1 and 120),
    apellidos text not null check (char_length(btrim(apellidos)) between 1 and 120),
    telefono text not null check (telefono ~ '^\+?[0-9]{7,15}$'),
    correo text not null unique check (
        char_length(correo) <= 254 and correo = lower(correo)
        and correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
    correo_verificado_en timestamptz,
    activo boolean not null default true,
    cambio_clave_pendiente boolean not null default true,
    check ((rol_codigo = 'veedor') = (recinto_base_id is not null))
);

create index perfiles_por_provincia_rol on public.perfiles (provincia_id, rol_codigo);
create index perfiles_por_recinto on public.perfiles (recinto_base_id) where recinto_base_id is not null;

create table public.coordinaciones (
    id bigint generated always as identity primary key,
    recinto_id bigint not null references public.recintos,
    coordinador_id uuid not null references public.perfiles(usuario_id),
    asignado_por uuid not null references public.perfiles(usuario_id),
    desde timestamptz not null default now(),
    hasta timestamptz,
    check (hasta is null or hasta >= desde)
);

create unique index coordinacion_vigente_por_recinto
    on public.coordinaciones (recinto_id) where hasta is null;
create index coordinaciones_por_coordinador on public.coordinaciones (coordinador_id, recinto_id)
    where hasta is null;

create table public.asignaciones (
    id bigint generated always as identity primary key,
    mesa_id bigint not null references public.mesas,
    veedor_id uuid not null references public.perfiles(usuario_id),
    asignado_por uuid not null references public.perfiles(usuario_id),
    desde timestamptz not null default now(),
    hasta timestamptz,
    check (hasta is null or hasta >= desde)
);

create unique index asignacion_vigente_por_mesa
    on public.asignaciones (mesa_id) where hasta is null;
create unique index asignacion_vigente_por_veedor
    on public.asignaciones (veedor_id) where hasta is null;
create index historial_asignaciones_por_mesa on public.asignaciones (mesa_id, desde desc);

create table public.dignidades (
    codigo text primary key check (codigo in ('alcaldia', 'prefectura')),
    nombre text not null unique
);

insert into public.dignidades values ('alcaldia', 'Alcaldía'), ('prefectura', 'Prefectura');

create table public.contiendas (
    id bigint generated always as identity primary key,
    dignidad_codigo text not null references public.dignidades(codigo),
    provincia_id bigint not null references public.provincias,
    canton_id bigint,
    foreign key (canton_id, provincia_id) references public.cantones (id, provincia_id),
    check ((dignidad_codigo = 'alcaldia') = (canton_id is not null)),
    unique nulls not distinct (dignidad_codigo, provincia_id, canton_id),
    unique (id, dignidad_codigo)
);

create table public.organizaciones_politicas (
    id bigint generated always as identity primary key,
    codigo text not null unique check (btrim(codigo) <> ''),
    nombre text not null check (btrim(nombre) <> ''),
    color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
    es_simulacion boolean not null default false,
    fuente_url text,
    check (es_simulacion or fuente_url is not null)
);

create table public.candidatos (
    id bigint generated always as identity primary key,
    contienda_id bigint not null references public.contiendas,
    organizacion_id bigint not null references public.organizaciones_politicas,
    nombre text not null check (btrim(nombre) <> ''),
    binomio text check (btrim(binomio) <> ''),
    orden smallint not null check (orden between 1 and 5),
    es_simulacion boolean not null default false,
    fuente_url text,
    check (es_simulacion or fuente_url is not null),
    unique (contienda_id, orden),
    unique (contienda_id, organizacion_id),
    unique (id, contienda_id)
);

create index candidatos_por_organizacion on public.candidatos (organizacion_id);

create table public.actas (
    id uuid primary key,
    mesa_id bigint not null references public.mesas,
    contienda_id bigint not null,
    dignidad_codigo text not null,
    autor_id uuid not null references public.perfiles(usuario_id),
    total_sufragantes integer not null check (total_sufragantes >= 0),
    votos_blancos integer not null check (votos_blancos between 0 and total_sufragantes),
    votos_nulos integer not null check (votos_nulos between 0 and total_sufragantes),
    numero_acta text check (char_length(btrim(numero_acta)) between 1 and 80),
    codigo_control text check (char_length(btrim(codigo_control)) between 1 and 80),
    estado text not null default 'enviada' check (estado = 'enviada'),
    confirmada_en timestamptz not null check (isfinite(confirmada_en)),
    recibida_en timestamptz not null default now(),
    check (votos_blancos::bigint + votos_nulos <= total_sufragantes),
    foreign key (contienda_id, dignidad_codigo) references public.contiendas (id, dignidad_codigo),
    unique (mesa_id, dignidad_codigo),
    unique (id, contienda_id)
);

create index actas_por_contienda on public.actas (contienda_id, mesa_id);

create table public.votos (
    acta_id uuid not null,
    contienda_id bigint not null,
    candidato_id bigint not null,
    cantidad integer not null check (cantidad >= 0),
    primary key (acta_id, candidato_id),
    foreign key (acta_id, contienda_id) references public.actas (id, contienda_id),
    foreign key (candidato_id, contienda_id) references public.candidatos (id, contienda_id)
);

create index votos_por_candidato on public.votos (candidato_id);

create table public.evidencias (
    acta_id uuid primary key references public.actas,
    ruta_foto text not null unique check (btrim(ruta_foto) <> ''),
    latitud double precision not null check (latitud between -90 and 90),
    longitud double precision not null check (longitud between -180 and 180),
    precision_metros double precision not null
        check (precision_metros >= 0 and precision_metros < 'Infinity'::double precision),
    ubicacion_simulada boolean not null,
    capturada_en timestamptz not null check (isfinite(capturada_en))
);

-- Privilegios mínimos desde la primera migración. Las políticas se agregan después.
do $$
declare
    tabla text;
begin
    foreach tabla in array array[
        'roles', 'usuarios', 'perfiles', 'provincias', 'cantones', 'parroquias',
        'recintos', 'mesas', 'coordinaciones', 'asignaciones', 'dignidades',
        'contiendas', 'organizaciones_politicas', 'candidatos', 'actas', 'votos', 'evidencias'
    ] loop
        execute format('alter table public.%I enable row level security', tabla);
        execute format('revoke all on table public.%I from public, anon, authenticated', tabla);
    end loop;
end;
$$;

revoke execute on function privado.cedula_valida(text) from public, anon, authenticated;

commit;
