begin;

create table if not exists public.paineis (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  ativo boolean not null default true,
  liberado_todos boolean not null default false,
  capa_url text,
  ordem integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.painel_modulos (
  id uuid primary key default gen_random_uuid(),
  painel_id uuid not null references public.paineis(id) on delete cascade,
  titulo text not null,
  descricao text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.painel_aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.painel_modulos(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text not null check (tipo in ('arquivo', 'youtube', 'link', 'texto')),
  url text,
  conteudo text,
  arquivo_path text,
  arquivo_nome text,
  arquivo_tamanho bigint check (arquivo_tamanho is null or arquivo_tamanho >= 0),
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.painel_acessos (
  id uuid primary key default gen_random_uuid(),
  painel_id uuid not null references public.paineis(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  liberado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (painel_id, aluno_id)
);

create table if not exists public.aula_progresso (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.painel_aulas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  concluida boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (aula_id, profile_id)
);

create index if not exists painel_modulos_painel_ordem_idx
  on public.painel_modulos (painel_id, ordem);
create index if not exists painel_aulas_modulo_ordem_idx
  on public.painel_aulas (modulo_id, ordem);
create index if not exists painel_acessos_aluno_idx
  on public.painel_acessos (aluno_id);
create index if not exists aula_progresso_profile_idx
  on public.aula_progresso (profile_id);

grant select, insert, update, delete on public.paineis to authenticated;
grant select, insert, update, delete on public.painel_modulos to authenticated;
grant select, insert, update, delete on public.painel_aulas to authenticated;
grant select, insert, update, delete on public.painel_acessos to authenticated;
grant select, insert, update, delete on public.aula_progresso to authenticated;

create or replace function public.member_user_can(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when p.role = 'admin' then true
      when p.permissoes ? permission_key then p.permissoes ->> permission_key = 'true'
      when permission_key = 'membros_ver' and p.role in ('secretaria', 'professor') then true
      when permission_key = 'membros_editar' and p.role = 'secretaria' then true
      else false
    end
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

create or replace function public.member_can_access_panel_folder(panel_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.paineis p
    where p.id::text = panel_folder
      and p.ativo
      and (
        exists (
          select 1
          from public.painel_acessos pa
          join public.alunos a on a.id = pa.aluno_id
          where pa.painel_id = p.id
            and a.profile_id = auth.uid()
        )
        or (
          p.liberado_todos
          and exists (
            select 1
            from public.alunos a
            where a.profile_id = auth.uid()
              and a.status = 'ativo'
          )
        )
      )
  );
$$;

create or replace function public.member_can_access_lesson(target_aula_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.painel_aulas a
    join public.painel_modulos m on m.id = a.modulo_id
    where a.id = target_aula_id
      and public.member_can_access_panel_folder(m.painel_id::text)
  );
$$;

revoke all on function public.member_user_can(text) from public;
revoke all on function public.member_can_access_panel_folder(text) from public;
revoke all on function public.member_can_access_lesson(uuid) from public;
grant execute on function public.member_user_can(text) to authenticated;
grant execute on function public.member_can_access_panel_folder(text) to authenticated;
grant execute on function public.member_can_access_lesson(uuid) to authenticated;

alter table public.paineis enable row level security;
alter table public.painel_modulos enable row level security;
alter table public.painel_aulas enable row level security;
alter table public.painel_acessos enable row level security;
alter table public.aula_progresso enable row level security;

drop policy if exists membros_paineis_select on public.paineis;
create policy membros_paineis_select on public.paineis
  for select to authenticated
  using (
    public.member_user_can('membros_ver')
    or public.member_can_access_panel_folder(id::text)
  );
drop policy if exists membros_paineis_insert on public.paineis;
create policy membros_paineis_insert on public.paineis
  for insert to authenticated
  with check (public.member_user_can('membros_editar') and created_by = auth.uid());
drop policy if exists membros_paineis_update on public.paineis;
create policy membros_paineis_update on public.paineis
  for update to authenticated
  using (public.member_user_can('membros_editar'))
  with check (public.member_user_can('membros_editar'));
drop policy if exists membros_paineis_delete on public.paineis;
create policy membros_paineis_delete on public.paineis
  for delete to authenticated
  using (public.member_user_can('membros_editar'));

drop policy if exists membros_modulos_select on public.painel_modulos;
create policy membros_modulos_select on public.painel_modulos
  for select to authenticated
  using (
    public.member_user_can('membros_ver')
    or public.member_can_access_panel_folder(painel_id::text)
  );
drop policy if exists membros_modulos_insert on public.painel_modulos;
create policy membros_modulos_insert on public.painel_modulos
  for insert to authenticated
  with check (public.member_user_can('membros_editar'));
drop policy if exists membros_modulos_update on public.painel_modulos;
create policy membros_modulos_update on public.painel_modulos
  for update to authenticated
  using (public.member_user_can('membros_editar'))
  with check (public.member_user_can('membros_editar'));
drop policy if exists membros_modulos_delete on public.painel_modulos;
create policy membros_modulos_delete on public.painel_modulos
  for delete to authenticated
  using (public.member_user_can('membros_editar'));

drop policy if exists membros_aulas_select on public.painel_aulas;
create policy membros_aulas_select on public.painel_aulas
  for select to authenticated
  using (
    public.member_user_can('membros_ver')
    or exists (
      select 1
      from public.painel_modulos m
      where m.id = modulo_id
        and public.member_can_access_panel_folder(m.painel_id::text)
    )
  );
drop policy if exists membros_aulas_insert on public.painel_aulas;
create policy membros_aulas_insert on public.painel_aulas
  for insert to authenticated
  with check (public.member_user_can('membros_editar'));
drop policy if exists membros_aulas_update on public.painel_aulas;
create policy membros_aulas_update on public.painel_aulas
  for update to authenticated
  using (public.member_user_can('membros_editar'))
  with check (public.member_user_can('membros_editar'));
drop policy if exists membros_aulas_delete on public.painel_aulas;
create policy membros_aulas_delete on public.painel_aulas
  for delete to authenticated
  using (public.member_user_can('membros_editar'));

drop policy if exists membros_acessos_select on public.painel_acessos;
create policy membros_acessos_select on public.painel_acessos
  for select to authenticated
  using (
    public.member_user_can('membros_ver')
    or exists (
      select 1 from public.alunos a
      where a.id = aluno_id and a.profile_id = auth.uid()
    )
  );
drop policy if exists membros_acessos_insert on public.painel_acessos;
create policy membros_acessos_insert on public.painel_acessos
  for insert to authenticated
  with check (public.member_user_can('membros_editar'));
drop policy if exists membros_acessos_update on public.painel_acessos;
create policy membros_acessos_update on public.painel_acessos
  for update to authenticated
  using (public.member_user_can('membros_editar'))
  with check (public.member_user_can('membros_editar'));
drop policy if exists membros_acessos_delete on public.painel_acessos;
create policy membros_acessos_delete on public.painel_acessos
  for delete to authenticated
  using (public.member_user_can('membros_editar'));

drop policy if exists membros_progresso_select on public.aula_progresso;
create policy membros_progresso_select on public.aula_progresso
  for select to authenticated
  using (
    public.member_user_can('membros_ver')
    or profile_id = auth.uid()
  );
drop policy if exists membros_progresso_insert on public.aula_progresso;
create policy membros_progresso_insert on public.aula_progresso
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and (
      public.member_user_can('membros_ver')
      or public.member_can_access_lesson(aula_id)
    )
  );
drop policy if exists membros_progresso_update on public.aula_progresso;
create policy membros_progresso_update on public.aula_progresso
  for update to authenticated
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and (
      public.member_user_can('membros_ver')
      or public.member_can_access_lesson(aula_id)
    )
  );
drop policy if exists membros_progresso_delete on public.aula_progresso;
create policy membros_progresso_delete on public.aula_progresso
  for delete to authenticated
  using (
    profile_id = auth.uid()
    and (
      public.member_user_can('membros_ver')
      or public.member_can_access_lesson(aula_id)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('materiais', 'materiais', false, 52428800),
  ('capas', 'capas', true, 5242880)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

drop policy if exists membros_materiais_select on storage.objects;
create policy membros_materiais_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'materiais'
    and (
      public.member_user_can('membros_ver')
      or public.member_can_access_panel_folder((storage.foldername(name))[1])
    )
  );
drop policy if exists membros_materiais_insert on storage.objects;
create policy membros_materiais_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materiais' and public.member_user_can('membros_editar'));
drop policy if exists membros_materiais_update on storage.objects;
create policy membros_materiais_update on storage.objects
  for update to authenticated
  using (bucket_id = 'materiais' and public.member_user_can('membros_editar'))
  with check (bucket_id = 'materiais' and public.member_user_can('membros_editar'));
drop policy if exists membros_materiais_delete on storage.objects;
create policy membros_materiais_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'materiais' and public.member_user_can('membros_editar'));

drop policy if exists membros_capas_select on storage.objects;
create policy membros_capas_select on storage.objects
  for select to public
  using (bucket_id = 'capas');
drop policy if exists membros_capas_insert on storage.objects;
create policy membros_capas_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'capas' and public.member_user_can('membros_editar'));
drop policy if exists membros_capas_update on storage.objects;
create policy membros_capas_update on storage.objects
  for update to authenticated
  using (bucket_id = 'capas' and public.member_user_can('membros_editar'))
  with check (bucket_id = 'capas' and public.member_user_can('membros_editar'));
drop policy if exists membros_capas_delete on storage.objects;
create policy membros_capas_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'capas' and public.member_user_can('membros_editar'));

commit;