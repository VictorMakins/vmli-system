https://victormakins.github.io/vmli-system/

## Como rodar localmente

1. Abra o terminal na pasta do projeto.
2. Execute:
   npm start
3. Acesse:
   http://localhost:3000

Essa aplicação é um frontend estático e precisa de um servidor web para funcionar corretamente em ambiente local.

## Área de Membros

Se a aba mostrar um erro informando que falta uma tabela, abra o projeto no Supabase, entre em **SQL Editor**, cole o conteúdo de [`03_area_membros.sql`](03_area_membros.sql) e selecione **Run**. O script cria as tabelas, permissões e buckets de arquivos usados pela Área de Membros. Depois, atualize o aplicativo.

## Cadastro e recuperação de conta

Para ativar o cadastro público, execute [`04_cadastro_publico.sql`](04_cadastro_publico.sql) no **SQL Editor** do Supabase. O gatilho cria automaticamente um perfil com papel de aluno; permissões administrativas continuam disponíveis apenas pelo cadastro feito por um administrador.

Depois de executar `03_area_membros.sql` e `04_cadastro_publico.sql`, execute [`05_area_aluno.sql`](05_area_aluno.sql). Ele separa materiais de exercícios e vincula o login confirmado ao cadastro escolar quando existe uma única correspondência de email. Emails repetidos não são vinculados automaticamente; nesses casos, a secretaria deve conferir o cadastro.

No Supabase, habilite o cadastro pelo provedor **Email** e adicione `https://victormakins.github.io/vmli-system/` à lista de URLs permitidas em **Authentication > URL Configuration**. Essa URL é usada pelos links de confirmação e redefinição de senha.

Quem não tiver mais acesso ao email cadastrado deve procurar a secretaria da VMLI para confirmar a identidade e recuperar o acesso.

## Foto de perfil

Para habilitar o envio e a sincronização das fotos de perfil, execute [`06_foto_perfil.sql`](06_foto_perfil.sql) no **SQL Editor** do Supabase. O bucket é público para exibir as fotos e permite que cada usuário envie ou atualize somente a própria imagem.

## Portal do aluno e agenda

Depois dos scripts `03_area_membros.sql` e `05_area_aluno.sql`, execute [`schema-novas-tabelas.sql`](schema-novas-tabelas.sql) no **SQL Editor** do Supabase. A migração cria materiais privados por nível, exercícios A1–C2, progresso, solicitações de adiantamento e agenda/check-in. O portal usa o vínculo `alunos.profile_id`; cadastros sem vínculo precisam ser corrigidos pela secretaria.

O link do Google Forms é público. Como o formulário não informa automaticamente a nota ao sistema, o aluno deve selecionar em “Meu nível e materiais” o nível exibido ao concluir o teste. Administradores também podem corrigir o nível e cadastrar o link do contrato na ficha do aluno.

Professores são cadastrados pela gestão com foto profissional, telefone e Pix. A agenda permite adicionar cada aula ao Google Calendar e registra check-ins dos alunos dentro do horário permitido. O botão cria um evento na conta Google do usuário; sincronização bidirecional automática exige configurar um projeto Google Cloud com OAuth e não está ativa neste frontend.

Os pedidos de adiantamento ficam registrados no Supabase. A cópia automática para uma planilha está desativada até configurar um endpoint HTTPS confiável em `PLANILHA_WEBHOOK` no `app.js`; não coloque chaves privadas ou credenciais Google no frontend.
