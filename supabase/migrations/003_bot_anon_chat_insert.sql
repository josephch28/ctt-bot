-- El bot puede insertar user/assistant con anon si aún no hay service_role.
create policy messages_anon_insert_chat on public.messages
  for insert to anon
  with check (role in ('user', 'assistant'));
