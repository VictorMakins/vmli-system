begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'A tabela public.profiles precisa existir antes de ativar o cadastro público.';
  end if;
end;
$$;

alter table public.profiles
  add column if not exists username text;

-- Staff accounts created by administrators may continue to use email only.
alter table public.profiles
  alter column username drop not null;

-- Normalize existing values before enforcing case-insensitive uniqueness.
update public.profiles
set username = nullif(lower(btrim(username)), '')
where username is not null;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where username is not null
    group by username
    having count(*) > 1
  ) then
    raise exception 'Existem nomes de usuário repetidos em public.profiles. Corrija-os antes de executar esta migração.';
  end if;

  if exists (
    select 1
    from public.profiles
    where username is not null
      and username !~ '^[a-z0-9._]{3,30}$'
  ) then
    raise exception 'Existem nomes de usuário inválidos em public.profiles. Use de 3 a 30 letras, números, pontos ou sublinhados.';
  end if;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (username is null or username ~ '^[a-z0-9._]{3,30}$');

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_username text;
begin
  new_username := nullif(lower(btrim(new.raw_user_meta_data ->> 'username')), '');

  if new_username is not null and new_username !~ '^[a-z0-9._]{3,30}$' then
    raise exception 'Nome de usuário inválido. Use de 3 a 30 letras, números, pontos ou sublinhados.'
      using errcode = '22023';
  end if;

  insert into public.profiles as profile (id, name, email, role, valor_aula, ativo, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email,
    'aluno',
    0,
    true,
    new_username
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        ativo = true,
        username = coalesce(excluded.username, profile.username);

  return new;
end;
$$;

alter function public.handle_new_user_profile() owner to postgres;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

commit;
