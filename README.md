https://victormakins.github.io/vmli-system/

## Área de Membros

Se a aba mostrar um erro informando que falta uma tabela, abra o projeto no Supabase, entre em **SQL Editor**, cole o conteúdo de [`03_area_membros.sql`](03_area_membros.sql) e selecione **Run**. O script cria as tabelas, permissões e buckets de arquivos usados pela Área de Membros. Depois, atualize o aplicativo.

## Cadastro e recuperação de conta

Para ativar o cadastro público, execute [`04_cadastro_publico.sql`](04_cadastro_publico.sql) no **SQL Editor** do Supabase. O gatilho cria automaticamente um perfil com papel de aluno; permissões administrativas continuam disponíveis apenas pelo cadastro feito por um administrador.

Depois de executar `03_area_membros.sql` e `04_cadastro_publico.sql`, execute [`05_area_aluno.sql`](05_area_aluno.sql). Ele separa materiais de exercícios e vincula o login confirmado ao cadastro escolar quando existe uma única correspondência de email. Emails repetidos não são vinculados automaticamente; nesses casos, a secretaria deve conferir o cadastro.

No Supabase, habilite o cadastro pelo provedor **Email** e adicione `https://victormakins.github.io/vmli-system/` à lista de URLs permitidas em **Authentication > URL Configuration**. Essa URL é usada pelos links de confirmação e redefinição de senha.

Quem não tiver mais acesso ao email cadastrado deve procurar a secretaria da VMLI para confirmar a identidade e recuperar o acesso.
