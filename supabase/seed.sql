-- Datos históricos para una demostración del escrutinio. Seccionales del 5 de febrero de 2023.
-- Recintos y cantidad de juntas por sexo: CNE Imbabura, informe del 01/03/2023, págs. 13–14.
-- Códigos de provincia y cantón: codificación electoral CNE del catastro de Imbabura.
-- Las candidaturas se limitan a cinco por dignidad según la línea base de la aplicación.

-- Una sola sentencia ejecuta toda la precarga en SQL Editor.
do $precarga$
declare
    recinto record;
    id_recinto bigint;
    fuente_recintos constant text :=
        'https://delegaciones.cne.gob.ec/wp-content/uploads/2024/02/IMPLEMENTACION-DE-POLITICAS-PUBLICAS-DE-DISCAPACIDADES.pdf';
begin
    insert into public.provincias (codigo_cne, nombre) values ('10', 'Imbabura')
    on conflict (nombre) do nothing;

    insert into public.cantones (provincia_id, codigo_cne, nombre)
    select p.id, '40', 'Cotacachi' from public.provincias p where p.nombre = 'Imbabura'
    on conflict (provincia_id, nombre) do nothing;

    insert into public.parroquias (canton_id, codigo_cne, nombre)
    select c.id, datos.codigo, datos.nombre
    from public.cantones c join public.provincias p on p.id = c.provincia_id
    cross join (values
        ('3800', '6 de Julio de Cuellaje'), ('145', 'Apuela'),
        ('1310', 'García Moreno / Llurimagua'), ('1710', 'Imantag'),
        ('2820', 'Peñaherrera'), ('2915', 'Plaza Gutiérrez / Calvario'),
        ('3115', 'Quiroga'), ('5910', 'El Sagrario'),
        ('5955', 'San Francisco'), ('4185', 'Vacas Galindo')
    ) as datos(codigo, nombre)
    where c.nombre = 'Cotacachi' and p.nombre = 'Imbabura'
    on conflict (canton_id, nombre) do nothing;

    -- El conjunto de recintos solo se usa en la consulta de este bucle.
    for recinto in
        select pa.id as parroquia_id, datos.zona, datos.nombre, datos.juntas_f, datos.juntas_m
        from (values
            ('Apuela', '', 'Unidad Educativa Apuela Bloque B', 3, 3),
            ('García Moreno / Llurimagua', 'Las Golondrinas', 'Unidad Educativa Santa Ana de Cotacachi', 5, 5),
            ('García Moreno / Llurimagua', 'Rumiñahui', 'Casa Comunal Rumiñahui', 1, 1),
            ('García Moreno / Llurimagua', 'La Independiente', 'EGB Luis Ulpiano de la Torre', 1, 1),
            ('García Moreno / Llurimagua', 'García Moreno / Llurimagua', 'Unidad Educativa García Moreno', 4, 5),
            ('García Moreno / Llurimagua', 'Naranjito', 'Educación General Básica Santa Marianita de Jesús', 1, 1),
            ('García Moreno / Llurimagua', 'La Magdalena Baja', 'Unidad Educativa Isla Santa Isabel', 1, 1),
            ('García Moreno / Llurimagua', 'El Chontal', 'Unidad Educativa Isla Santa Isabel Bloque B', 1, 1),
            ('García Moreno / Llurimagua', 'Cielo Verde', 'Educación General Básica Rafael León Carvajal', 1, 1),
            ('Imantag', 'Imantag', 'Unidad Educativa del Milenio Yachana Wasi', 4, 3),
            ('Imantag', 'Imantag', 'Unidad Educativa Imantag / Ex Escuela Pedro Fermín Cevallos', 4, 4),
            ('Imantag', 'Piñan', 'Escuela Abelardo Morán Muñoz', 1, 1),
            ('Peñaherrera', 'Peñaherrera', 'Unidad Educativa José Peralta', 2, 2),
            ('Peñaherrera', 'El Cristal', 'Educación General Básica León Tolstoy', 1, 1),
            ('Peñaherrera', 'Nangulví Bajo', 'Casa Comunal Nangulví Bajo', 1, 1),
            ('Plaza Gutiérrez / Calvario', '', 'Educación General Básica Apuela Bloque D', 1, 1),
            ('Quiroga', '', 'Unidad Educativa Luis Plutarco Cevallos', 5, 5),
            ('Quiroga', '', 'Escuela de Educación Básica Andrés Avelino de la Torre', 5, 5),
            ('6 de Julio de Cuellaje', '', 'Unidad Educativa Cuellaje', 3, 3),
            ('Vacas Galindo', '', 'Educación General Básica García Moreno', 1, 1),
            ('El Sagrario', '', 'Unidad Educativa Seis de Julio', 7, 6),
            ('El Sagrario', '', 'Unidad Educativa Luis Ulpiano de la Torre', 9, 9),
            ('San Francisco', '', 'Unidad Educativa Modesto Peñaherrera', 5, 4),
            ('San Francisco', '', 'Escuela Manuela Cañizares', 4, 4)
        ) as datos(parroquia, zona, nombre, juntas_f, juntas_m)
        join public.parroquias pa on pa.nombre = datos.parroquia
        join public.cantones c on c.id = pa.canton_id
        join public.provincias p on p.id = c.provincia_id
        where c.nombre = 'Cotacachi' and p.nombre = 'Imbabura'
        order by pa.id, datos.zona, datos.nombre
    loop
        insert into public.recintos (parroquia_id, zona, nombre, fuente_url)
        values (recinto.parroquia_id, recinto.zona, recinto.nombre, fuente_recintos)
        on conflict (parroquia_id, zona, nombre) do nothing
        returning id into id_recinto;

        if not found then
            select r.id into strict id_recinto
            from public.recintos r
            where r.parroquia_id = recinto.parroquia_id and r.zona = recinto.zona
              and r.nombre = recinto.nombre;
        end if;

        -- El ordinal interno identifica la mesa por recinto y sexo. Como la fuente
        -- publica cantidades agregadas, el número oficial de JRV queda sin asignar.
        insert into public.mesas (recinto_id, numero, sexo, fuente_url)
        select id_recinto, junta.numero, grupo.sexo, fuente_recintos
        from (values ('F', recinto.juntas_f), ('M', recinto.juntas_m)) as grupo(sexo, cantidad)
        cross join lateral generate_series(1, grupo.cantidad) as junta(numero)
        on conflict (recinto_id, numero, sexo) do nothing;
    end loop;

    insert into public.contiendas (dignidad_codigo, provincia_id, canton_id)
    select datos.dignidad, p.id, case when datos.dignidad = 'alcaldia' then c.id end
    from public.provincias p join public.cantones c on c.provincia_id = p.id
    cross join (values ('alcaldia'), ('prefectura')) as datos(dignidad)
    where p.nombre = 'Imbabura' and c.nombre = 'Cotacachi'
    on conflict (dignidad_codigo, provincia_id, canton_id) do nothing;

    -- Los colores son de la interfaz de demostración.
    insert into public.organizaciones_politicas (codigo, nombre, color, fuente_url) values
        ('1', 'Centro Democrático', '#28613D',
         'https://elnorte.ec/centro-democratico-mostro-sus-candidatos-para-elecciones/'),
        ('5', 'Revolución Ciudadana', '#1D55A3',
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html'),
        ('18', 'Movimiento de Unidad Plurinacional Pachakutik', '#784990',
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html'),
        ('100', 'Movimiento Únete', '#AD4A26',
         'https://elnorte.ec/municipio-cotacachi-tiene-autoridades/'),
        ('103-8', 'Alianza Vivir Bien / Avanza', '#008087',
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html'),
        ('8-2', 'Alianza Avanza / Unidad Popular', '#5B429C',
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html'),
        ('62-33-25', 'Alianza Somos Libres / RETO / Construye', '#9C2554',
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html'),
        ('1-12', 'Alianza Centro Democrático / Izquierda Democrática', '#936014',
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html')
    on conflict (codigo) do nothing;

    insert into public.candidatos (contienda_id, organizacion_id, nombre, binomio, orden, fuente_url)
    select c.id, o.id, datos.candidato, datos.binomio, datos.orden, datos.fuente
    from (values
        ('alcaldia', '1', 'Paúl Rodas Ávila', null, 1,
         'https://elnorte.ec/antonio-ante-cotacachi-urcuqui-y-pimampiro-eligieron-a-sus-alcaldes/'),
        ('alcaldia', '5', 'Peter Ubidia', null, 2,
         'https://elnorte.ec/municipio-cotacachi-tiene-autoridades/'),
        ('alcaldia', '18', 'Katerine Andrade', null, 3,
         'https://hoyenimbabura.com/2023/01/03/demasiados-candidatos-para-tan-pocos-cantones/'),
        ('alcaldia', '100', 'Auki Tituaña', null, 4,
         'https://elnorte.ec/municipio-cotacachi-tiene-autoridades/'),
        ('alcaldia', '103-8', 'Jomar Cevallos Moreno', null, 5,
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html'),
        ('prefectura', '5', 'Richard Calderón Saltos', 'Paolina Vercoutère Quinche', 1,
         'https://www.cne.gob.ec/wp-content/uploads/2024/01/index.html'),
        ('prefectura', '8-2', 'Lucía Posso', 'Juan Carlos Farinango', 2,
         'https://www.expectativa.ec/richard-calderon-gano-con-84-244-votos-el-3433/'),
        ('prefectura', '62-33-25', 'Jorge Martínez', 'Sofía Fuentes', 3,
         'https://www.expectativa.ec/richard-calderon-gano-con-84-244-votos-el-3433/'),
        ('prefectura', '1-12', 'Gustavo Pareja', 'Hipatia Gudiño', 4,
         'https://www.expectativa.ec/richard-calderon-gano-con-84-244-votos-el-3433/'),
        ('prefectura', '18', 'Marco Guatemal', 'Joselyn Tituaña Armas', 5,
         'https://www.expectativa.ec/richard-calderon-gano-con-84-244-votos-el-3433/')
    ) as datos(dignidad, organizacion, candidato, binomio, orden, fuente)
    join public.contiendas c on c.dignidad_codigo = datos.dignidad
    join public.provincias p on p.id = c.provincia_id
    left join public.cantones ca on ca.id = c.canton_id
    join public.organizaciones_politicas o on o.codigo = datos.organizacion
    where p.nombre = 'Imbabura' and (c.canton_id is null or ca.nombre = 'Cotacachi')
    on conflict (contienda_id, organizacion_id) do nothing;
end;
$precarga$;
