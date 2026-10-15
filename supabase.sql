-- ============================================================
-- PUNTO & ALMA · Tabla única para toda la tienda
-- Crea esto una sola vez en Supabase → SQL Editor → Run.
-- Guarda clientes, pedidos, boletín, bitácora, creaciones,
-- foro, catálogo y contenido del sitio en una sola tabla:
--   tienda_datos(clave, valor, actualizado)
-- Las claves son: pa_usuarios, pa_pedidos, pa_registros,
-- pa_boletin, pa_creaciones, pa_foro,
-- pa_catalogo_overrides, pa_contenido.
-- ============================================================

create table if not exists public.tienda_datos (
  clave text primary key,
  valor jsonb not null default 'null'::jsonb,
  actualizado timestamptz not null default now()
);

alter table public.tienda_datos enable row level security;

-- La tienda es estática (sin servidor), así que el panel usa la
-- API key pública (anon). Estas políticas permiten leer y
-- escribir solo esta tabla. No guardes aquí la service_role.
drop policy if exists "tienda leer" on public.tienda_datos;
create policy "tienda leer"
  on public.tienda_datos for select
  to anon
  using (true);

drop policy if exists "tienda escribir" on public.tienda_datos;
create policy "tienda escribir"
  on public.tienda_datos for insert
  to anon
  with check (true);

drop policy if exists "tienda actualizar" on public.tienda_datos;
create policy "tienda actualizar"
  on public.tienda_datos for update
  to anon
  using (true)
  with check (true);
