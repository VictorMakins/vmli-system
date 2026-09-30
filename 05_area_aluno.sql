begin;

alter table public.painel_aulas
  add column if not exists categoria text not null default 'material'
  check (categoria in ('material', 'exercicio'));

create or replace function public.link_verified_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matching_students integer;
begin
  if new.email is null
    or new.email_confirmed_at is null
    or coalesce(new.raw_user_meta_data ->> 'role', 'aluno') <> 'aluno' then
    return new;
  end if;

  select count(*) into matching_students
  from public.alunos a
  where lower(btrim(a.email)) = lower(btrim(new.email))
    and a.profile_id is null;

  if matching_students = 1 then
    update public.alunos
    set profile_id = new.id
    where lower(btrim(email)) = lower(btrim(new.email))
      and profile_id is null;
  end if;

  return new;
end;
$$;

revoke all on function public.link_verified_student_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_link_student_insert on auth.users;
create trigger on_auth_user_link_student_insert
  after insert on auth.users
  for each row execute function public.link_verified_student_profile();

drop trigger if exists on_auth_user_link_student_confirm on auth.users;
create trigger on_auth_user_link_student_confirm
  after update of email_confirmed_at on auth.users
  for each row execute function public.link_verified_student_profile();

create or replace function public.link_student_to_verified_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matching_profiles integer;
  matching_profile_id uuid;
begin
  if new.email is null or new.profile_id is not null then
    return new;
  end if;

  select count(*), (array_agg(p.id))[1]
  into matching_profiles, matching_profile_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'aluno'
    and u.email_confirmed_at is not null
    and coalesce(u.raw_user_meta_data ->> 'role', 'aluno') = 'aluno'
    and lower(btrim(p.email)) = lower(btrim(new.email));

  if matching_profiles = 1 then
    update public.alunos
    set profile_id = matching_profile_id
    where id = new.id and profile_id is null;
  end if;

  return new;
end;
$$;

revoke all on function public.link_student_to_verified_profile() from public, anon, authenticated;

drop trigger if exists on_student_link_verified_profile on public.alunos;
create trigger on_student_link_verified_profile
  after insert or update of email on public.alunos
  for each row execute function public.link_student_to_verified_profile();

do $$
declare
  matched record;
begin
  for matched in
    select a.id as aluno_id, p.id as profile_id
    from public.alunos a
    join public.profiles p
      on lower(btrim(p.email)) = lower(btrim(a.email))
     and p.role = 'aluno'
    join auth.users u
      on u.id = p.id
     and u.email_confirmed_at is not null
    where a.email is not null
      and a.profile_id is null
      and coalesce(u.raw_user_meta_data ->> 'role', 'aluno') = 'aluno'
      and (
        select count(*)
        from public.alunos same_email
        where lower(btrim(same_email.email)) = lower(btrim(a.email))
      ) = 1
      and (
        select count(*)
        from public.profiles same_profile
        join auth.users same_user on same_user.id = same_profile.id
        where same_profile.role = 'aluno'
          and same_user.email_confirmed_at is not null
          and lower(btrim(same_profile.email)) = lower(btrim(a.email))
      ) = 1
  loop
    update public.alunos
    set profile_id = matched.profile_id
    where id = matched.aluno_id and profile_id is null;
  end loop;
end;
$$;

commit;