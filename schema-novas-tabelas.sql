-- ============================================================
-- VMLI — Novas tabelas: nivelamento, materiais, exercícios,
-- progresso, agenda do professor, chamada automática
-- ============================================================
begin;

alter table public.alunos add column if not exists nivel text not null default 'A1';
alter table public.alunos add column if not exists nivel_teste_em timestamptz;
alter table public.alunos add column if not exists contrato_url text;

alter table public.profiles add column if not exists telefone text;
alter table public.profiles add column if not exists pix text;
alter table public.profiles add column if not exists foto_url text;
alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.materiais (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  nivel text not null check (nivel in ('A1','A2','B1','B2','C1','C2')),
  tipo text not null default 'arquivo',      -- arquivo | video | link
  url text,
  storage_path text,
  descricao text,
  ordem int default 0,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.exercicios (
  id uuid primary key default gen_random_uuid(),
  nivel text not null check (nivel in ('A1','A2','B1','B2','C1','C2')),
  modulo text not null,
  enunciado text not null,
  tipo text not null default 'multipla',     -- multipla | lacuna | verdadeiro_falso
  opcoes jsonb default '[]',
  resposta_correta text not null,
  explicacao text,
  ordem int default 0,
  created_at timestamptz default now()
);

create table if not exists public.progresso_exercicios (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references alunos(id) on delete cascade,
  exercicio_id uuid references exercicios(id) on delete cascade,
  acertou boolean not null,
  resposta_dada text,
  created_at timestamptz default now(),
  unique (aluno_id, exercicio_id)
);

create table if not exists public.progresso_conteudo (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references alunos(id) on delete cascade,
  aula_id uuid references aulas(id) on delete cascade,
  concluida boolean default true,
  created_at timestamptz default now(),
  unique (aluno_id, aula_id)
);

create table if not exists public.agenda_professor (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles(id) on delete cascade,
  turma_id uuid not null references public.turmas(id) on delete cascade,
  aula_id uuid references public.aulas(id) on delete set null,
  data date not null,
  hora_inicio time not null,
  hora_fim time,
  link_aula text,
  observacao text,
  aula_dada boolean not null default false,
  created_at timestamptz default now()
);
alter table public.agenda_professor add column if not exists aula_id uuid references public.aulas(id) on delete set null;

create table if not exists public.chamadas_link (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.agenda_professor(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  clicado_em timestamptz default now(),
  unique (agenda_id, aluno_id)
);

create table if not exists public.progresso_materiais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  material_id uuid not null references public.materiais(id) on delete cascade,
  concluida boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (aluno_id, material_id)
);

create table if not exists public.solicitacoes_adiantamento (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  parcela_id uuid not null references public.parcelas(id) on delete cascade,
  solicitante_profile_id uuid not null references public.profiles(id) on delete restrict,
  forma text not null,
  observacao text,
  status text not null default 'pendente' check (status in ('pendente','revisado','recusado')),
  revisado_por uuid references public.profiles(id) on delete set null,
  revisado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists materiais_nivel_ordem_idx on public.materiais(nivel,ordem);
create index if not exists agenda_professor_data_idx on public.agenda_professor(professor_id,data);
create index if not exists agenda_turma_data_idx on public.agenda_professor(turma_id,data);
create unique index if not exists adiantamentos_parcela_pendente_idx
  on public.solicitacoes_adiantamento(parcela_id) where status='pendente';

insert into storage.buckets (id,name,public,file_size_limit)
values ('materiais-nivel','materiais-nivel',false,52428800)
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit;
insert into storage.buckets (id,name,public,file_size_limit)
values ('profile-photos','profile-photos',true,5242880)
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit;

create or replace function public.vml_current_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role::text from public.profiles p where p.id=auth.uid() limit 1
$$;

create or replace function public.vml_current_student_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select a.id from public.alunos a where a.profile_id=auth.uid() limit 1
$$;

create or replace function public.vml_current_student_level()
returns text language sql stable security definer set search_path = '' as $$
  select a.nivel from public.alunos a where a.profile_id=auth.uid() limit 1
$$;

create or replace function public.vml_can_access_agenda(target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agenda_professor ag
    where ag.id=target_id and (
      ag.professor_id=auth.uid()
      or public.vml_current_role() in ('admin','secretaria')
      or exists (
        select 1 from public.turma_alunos ta
        where ta.turma_id=ag.turma_id and ta.aluno_id=public.vml_current_student_id() and ta.status='active'
      )
    )
  )
$$;

create or replace function public.vml_can_manage_agenda(target_turma_id uuid,target_professor_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.vml_current_role() in ('admin','secretaria') or (
    target_professor_id=auth.uid()
    and exists(select 1 from public.turmas t where t.id=target_turma_id and t.professor_id=auth.uid())
  )
$$;

create or replace function public.vml_can_check_in(target_agenda_id uuid,target_aluno_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_aluno_id=public.vml_current_student_id() and exists (
    select 1
    from public.agenda_professor ag
    join public.turma_alunos ta on ta.turma_id=ag.turma_id
    where ag.id=target_agenda_id
      and ta.aluno_id=target_aluno_id and ta.status='active'
      and ag.data=(now() at time zone 'America/Sao_Paulo')::date
      and now() >= ((ag.data + ag.hora_inicio) at time zone 'America/Sao_Paulo') - interval '30 minutes'
      and now() <= ((ag.data + coalesce(ag.hora_fim,ag.hora_inicio + interval '90 minutes')) at time zone 'America/Sao_Paulo') + interval '30 minutes'
  )
$$;

create or replace function public.vml_set_student_level(new_level text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if new_level not in ('A1','A2','B1','B2','C1','C2') then
    raise exception 'Nível inválido';
  end if;
  update public.alunos set nivel=new_level,nivel_teste_em=now() where profile_id=auth.uid();
  if not found then raise exception 'Cadastro de aluno não vinculado'; end if;
end;
$$;

create or replace function public.vml_complete_agenda(target_agenda_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  agenda_row public.agenda_professor%rowtype;
  recorded_aula_id uuid;
  checkin record;
begin
  select * into agenda_row from public.agenda_professor where id=target_agenda_id for update;
  if not found then raise exception 'Aula não encontrada'; end if;
  if agenda_row.professor_id<>auth.uid() and public.vml_current_role() not in ('admin','secretaria') then
    raise exception 'Sem permissão para registrar esta aula';
  end if;
  if agenda_row.aula_dada then return agenda_row.aula_id; end if;

  recorded_aula_id := agenda_row.aula_id;
  if recorded_aula_id is null then
    select a.id into recorded_aula_id from public.aulas a
      where a.turma_id=agenda_row.turma_id and a.data=agenda_row.data limit 1;
    if recorded_aula_id is null then
      insert into public.aulas(turma_id,data,professor_id,is_substituicao,meet_link,notas)
      values(agenda_row.turma_id,agenda_row.data,agenda_row.professor_id,false,agenda_row.link_aula,agenda_row.observacao)
      returning id into recorded_aula_id;
    end if;
  end if;

  update public.agenda_professor set aula_id=recorded_aula_id,aula_dada=true where id=target_agenda_id;
  for checkin in select c.aluno_id from public.chamadas_link c where c.agenda_id=target_agenda_id loop
    if not exists(select 1 from public.presencas p where p.aula_id=recorded_aula_id and p.aluno_id=checkin.aluno_id) then
      insert into public.presencas(aula_id,aluno_id,status) values(recorded_aula_id,checkin.aluno_id,'P');
    end if;
  end loop;
  return recorded_aula_id;
end;
$$;

revoke all on function public.vml_current_role() from public,anon;
revoke all on function public.vml_current_student_id() from public,anon;
revoke all on function public.vml_current_student_level() from public,anon;
revoke all on function public.vml_can_access_agenda(uuid) from public,anon;
revoke all on function public.vml_can_manage_agenda(uuid,uuid) from public,anon;
revoke all on function public.vml_can_check_in(uuid,uuid) from public,anon;
revoke all on function public.vml_set_student_level(text) from public,anon;
revoke all on function public.vml_complete_agenda(uuid) from public,anon;
grant execute on function public.vml_current_role() to authenticated;
grant execute on function public.vml_current_student_id() to authenticated;
grant execute on function public.vml_current_student_level() to authenticated;
grant execute on function public.vml_can_access_agenda(uuid) to authenticated;
grant execute on function public.vml_can_manage_agenda(uuid,uuid) to authenticated;
grant execute on function public.vml_can_check_in(uuid,uuid) to authenticated;
grant execute on function public.vml_set_student_level(text) to authenticated;
grant execute on function public.vml_complete_agenda(uuid) to authenticated;

alter table public.materiais enable row level security;
alter table public.exercicios enable row level security;
alter table public.progresso_exercicios enable row level security;
alter table public.progresso_materiais enable row level security;
alter table public.agenda_professor enable row level security;
alter table public.chamadas_link enable row level security;
alter table public.solicitacoes_adiantamento enable row level security;

drop policy if exists vml_materiais_select on public.materiais;
create policy vml_materiais_select on public.materiais for select to authenticated
  using (public.vml_current_role() in ('admin','secretaria','professor','financeiro') or nivel=public.vml_current_student_level());
drop policy if exists vml_materiais_manage on public.materiais;
create policy vml_materiais_manage on public.materiais for all to authenticated
  using (public.vml_current_role() in ('admin','secretaria'))
  with check (public.vml_current_role() in ('admin','secretaria'));

drop policy if exists vml_exercicios_select on public.exercicios;
create policy vml_exercicios_select on public.exercicios for select to authenticated
  using (public.vml_current_role() in ('admin','secretaria','professor','financeiro') or nivel=public.vml_current_student_level());
drop policy if exists vml_exercicios_manage on public.exercicios;
create policy vml_exercicios_manage on public.exercicios for all to authenticated
  using (public.vml_current_role() in ('admin','secretaria'))
  with check (public.vml_current_role() in ('admin','secretaria'));

drop policy if exists vml_progresso_exercicios_self on public.progresso_exercicios;
create policy vml_progresso_exercicios_self on public.progresso_exercicios for all to authenticated
  using ((aluno_id=public.vml_current_student_id() and exists(select 1 from public.exercicios e where e.id=exercicio_id and e.nivel=public.vml_current_student_level()))
    or public.vml_current_role() in ('admin','secretaria'))
  with check ((aluno_id=public.vml_current_student_id() and exists(select 1 from public.exercicios e where e.id=exercicio_id and e.nivel=public.vml_current_student_level()))
    or public.vml_current_role() in ('admin','secretaria'));
drop policy if exists vml_progresso_materiais_self on public.progresso_materiais;
create policy vml_progresso_materiais_self on public.progresso_materiais for all to authenticated
  using ((aluno_id=public.vml_current_student_id() and exists(select 1 from public.materiais m where m.id=material_id and m.nivel=public.vml_current_student_level()))
    or public.vml_current_role() in ('admin','secretaria'))
  with check ((aluno_id=public.vml_current_student_id() and exists(select 1 from public.materiais m where m.id=material_id and m.nivel=public.vml_current_student_level()))
    or public.vml_current_role() in ('admin','secretaria'));

drop policy if exists vml_agenda_select on public.agenda_professor;
create policy vml_agenda_select on public.agenda_professor for select to authenticated
  using (public.vml_can_access_agenda(id));
drop policy if exists vml_agenda_manage on public.agenda_professor;
create policy vml_agenda_manage on public.agenda_professor for all to authenticated
  using (public.vml_can_manage_agenda(turma_id,professor_id))
  with check (public.vml_can_manage_agenda(turma_id,professor_id));

drop policy if exists vml_chamadas_select on public.chamadas_link;
create policy vml_chamadas_select on public.chamadas_link for select to authenticated
  using (aluno_id=public.vml_current_student_id() or public.vml_current_role() in ('admin','secretaria')
    or exists(select 1 from public.agenda_professor ag where ag.id=agenda_id and ag.professor_id=auth.uid()));
drop policy if exists vml_chamadas_insert on public.chamadas_link;
create policy vml_chamadas_insert on public.chamadas_link for insert to authenticated
  with check (public.vml_can_check_in(agenda_id,aluno_id));
drop policy if exists vml_chamadas_update on public.chamadas_link;
create policy vml_chamadas_update on public.chamadas_link for update to authenticated
  using (public.vml_can_check_in(agenda_id,aluno_id))
  with check (public.vml_can_check_in(agenda_id,aluno_id));

drop policy if exists vml_adiantamentos_select on public.solicitacoes_adiantamento;
create policy vml_adiantamentos_select on public.solicitacoes_adiantamento for select to authenticated
  using (aluno_id=public.vml_current_student_id() or public.vml_current_role() in ('admin','secretaria','financeiro'));
drop policy if exists vml_adiantamentos_insert on public.solicitacoes_adiantamento;
create policy vml_adiantamentos_insert on public.solicitacoes_adiantamento for insert to authenticated
  with check (aluno_id=public.vml_current_student_id() and solicitante_profile_id=auth.uid());
drop policy if exists vml_adiantamentos_update on public.solicitacoes_adiantamento;
create policy vml_adiantamentos_update on public.solicitacoes_adiantamento for update to authenticated
  using (public.vml_current_role() in ('admin','secretaria','financeiro'))
  with check (public.vml_current_role() in ('admin','secretaria','financeiro'));

drop policy if exists vml_materiais_nivel_select on storage.objects;
create policy vml_materiais_nivel_select on storage.objects for select to authenticated
  using (bucket_id='materiais-nivel' and (
    public.vml_current_role() in ('admin','secretaria','professor','financeiro')
    or (storage.foldername(name))[1]=public.vml_current_student_level()
  ));
drop policy if exists vml_materiais_nivel_insert on storage.objects;
create policy vml_materiais_nivel_insert on storage.objects for insert to authenticated
  with check (bucket_id='materiais-nivel' and public.vml_current_role() in ('admin','secretaria'));
drop policy if exists vml_materiais_nivel_update on storage.objects;
create policy vml_materiais_nivel_update on storage.objects for update to authenticated
  using (bucket_id='materiais-nivel' and public.vml_current_role() in ('admin','secretaria'))
  with check (bucket_id='materiais-nivel' and public.vml_current_role() in ('admin','secretaria'));
drop policy if exists vml_materiais_nivel_delete on storage.objects;
create policy vml_materiais_nivel_delete on storage.objects for delete to authenticated
  using (bucket_id='materiais-nivel' and public.vml_current_role() in ('admin','secretaria'));

drop policy if exists vml_profile_photos_manager_insert on storage.objects;
create policy vml_profile_photos_manager_insert on storage.objects for insert to authenticated
  with check (bucket_id='profile-photos' and public.vml_current_role() in ('admin','secretaria'));
drop policy if exists vml_profile_photos_manager_update on storage.objects;
create policy vml_profile_photos_manager_update on storage.objects for update to authenticated
  using (bucket_id='profile-photos' and public.vml_current_role() in ('admin','secretaria'))
  with check (bucket_id='profile-photos' and public.vml_current_role() in ('admin','secretaria'));
drop policy if exists vml_profile_photos_manager_delete on storage.objects;
create policy vml_profile_photos_manager_delete on storage.objects for delete to authenticated
  using (bucket_id='profile-photos' and public.vml_current_role() in ('admin','secretaria'));

insert into public.exercicios(nivel,modulo,enunciado,opcoes,resposta_correta,explicacao,ordem)
select seed.nivel,seed.modulo,seed.enunciado,seed.opcoes,seed.correta,seed.explicacao,seed.ordem
from (values
  ('A1','Verb to be','Complete: I ___ a student.','["am","is","are","be"]'::jsonb,'am','Com I, usamos am.',1),
  ('A1','Articles','Choose: She has ___ apple.','["a","an","the","no article"]'::jsonb,'an','Apple começa com som de vogal; usamos an.',2),
  ('A2','Simple past','Yesterday, we ___ to the park.','["go","went","gone","going"]'::jsonb,'went','Went é o passado irregular de go.',1),
  ('A2','Countable nouns','How ___ books do you have?','["much","many","any","some"]'::jsonb,'many','Many acompanha substantivos contáveis no plural.',2),
  ('B1','Present perfect','She ___ already finished her work.','["have","has","did","is"]'::jsonb,'has','Com she, usamos has + particípio.',1),
  ('B1','First conditional','If it rains, we ___ at home.','["stay","would stay","will stay","stayed"]'::jsonb,'will stay','If + present simple, will + verbo base.',2),
  ('B2','Passive voice','This novel ___ into several languages.','["translated","was translated","has translating","is translate"]'::jsonb,'was translated','Voz passiva no passado: was + particípio.',1),
  ('B2','Reported speech','He said he ___ busy.','["is","was","has","will"]'::jsonb,'was','No discurso indireto, o presente geralmente recua para o passado.',2),
  ('C1','Inversion','Rarely ___ such a moving performance.','["I have seen","have I seen","I saw","did I have seen"]'::jsonb,'have I seen','Após advérbio negativo, ocorre inversão auxiliar + sujeito.',1),
  ('C1','Concessive clauses','___ the delays, the team delivered on time.','["Although","Despite","Whereas","Even"]'::jsonb,'Despite','Despite é seguido por substantivo ou gerúndio.',2),
  ('C2','Subjunctive','The committee recommended that he ___ the proposal.','["revises","revised","revise","will revise"]'::jsonb,'revise','Após recommend that, usa-se o subjuntivo na forma base.',1),
  ('C2','Inversion','Not until midnight ___ the missing file.','["they found","did they find","they had found","found they"]'::jsonb,'did they find','Not until no início pede inversão com did + sujeito + verbo base.',2)
) as seed(nivel,modulo,enunciado,opcoes,correta,explicacao,ordem)
where not exists(select 1 from public.exercicios e where e.nivel=seed.nivel and e.enunciado=seed.enunciado);

grant select,insert,update,delete on public.materiais,public.exercicios,public.progresso_exercicios,
  public.progresso_materiais,public.agenda_professor,public.chamadas_link,public.solicitacoes_adiantamento to authenticated;

commit;

-- Se seu projeto usa RLS, adicione policies para authenticated
-- (select/insert/update/delete) nestas tabelas, no mesmo padrão das existentes.