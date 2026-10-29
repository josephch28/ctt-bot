-- Esquema inicial CTT: catálogo, FAQs, conversaciones y mensajes.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  descripcion text,
  temario text,
  requisitos text,
  horas integer,
  modalidad text,
  horario text,
  fecha_inicio text,
  precio numeric,
  descuentos jsonb not null default '[]'::jsonb,
  certificacion text,
  cupos integer,
  docente text,
  link_inscripcion text,
  publico text,
  keywords text[],
  url_origen text unique,
  activo boolean not null default true,
  actualizado_en timestamptz not null default now()
);

create table public.faqs (
  id serial primary key,
  pregunta text,
  respuesta text
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'telegram',
  external_id text,
  nombre text,
  username text,
  mode text not null default 'ai' check (mode in ('ai', 'human')),
  estado text not null default 'interesado'
    check (estado in ('interesado', 'dudoso', 'frustrado', 'lead_caliente')),
  intencion text,
  perfil jsonb,
  resumen text,
  curso_interes uuid references public.courses (id),
  alerta_seguridad boolean not null default false,
  handover_count integer not null default 0,
  tokens_usados integer not null default 0,
  mensajes_desde_resumen integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_id)
);

create table public.messages (
  id bigserial primary key,
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'operator', 'system')),
  content text,
  tipo text not null default 'texto' check (tipo in ('texto', 'voz')),
  delivered boolean not null default true,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- updated_at automático en conversations
create or replace function public.set_conversations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_conversations_updated_at();

-- cada INSERT en messages toca conversations.updated_at
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row
execute function public.touch_conversation_on_message();

alter table public.conversations replica identity full;
alter table public.messages replica identity full;

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;

alter table public.courses enable row level security;
alter table public.faqs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Políticas abiertas para anon (hackatón).
-- anon solo inserta messages con role operator o system.
create policy courses_anon_all on public.courses
  for all to anon using (true) with check (true);

create policy faqs_anon_all on public.faqs
  for all to anon using (true) with check (true);

create policy conversations_anon_all on public.conversations
  for all to anon using (true) with check (true);

create policy messages_anon_select on public.messages
  for select to anon using (true);

create policy messages_anon_update on public.messages
  for update to anon using (true) with check (true);

create policy messages_anon_delete on public.messages
  for delete to anon using (true);

create policy messages_anon_insert on public.messages
  for insert to anon
  with check (role in ('operator', 'system'));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.courses to anon, authenticated;
grant select, insert, update, delete on public.faqs to anon, authenticated;
grant select, insert, update, delete on public.conversations to anon, authenticated;
grant select, insert, update, delete on public.messages to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
