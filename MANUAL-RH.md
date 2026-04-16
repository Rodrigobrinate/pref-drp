# Manual do RH

## Visão Geral
Este documento orienta o setor de Recursos Humanos no uso do sistema **Nomos** para gestão do ciclo anual de avaliação de desempenho.

Hoje o módulo RH permite:
- acessar o RH de forma global
- visualizar todos os projetos disponíveis
- escolher qual projeto deseja administrar
- criar um novo ciclo anual
- finalizar um projeto
- importar a base de servidores por XML
- acompanhar o status geral das avaliações
- solicitar reavaliação de um servidor
- trabalhar com upload de comprovantes gravados no Google Drive

## Acesso ao Sistema
O RH agora utiliza um acesso global:

```text
/rh/login
```

### Credenciais
- Login: CPF
- Senha inicial: o próprio CPF

Após o login, o RH é direcionado para o hub global de projetos em:

```text
/rh
```

## Como Entrar como RH
1. Abra `/rh/login`.
2. Informe o CPF do usuário RH.
3. Informe a senha inicial.
4. O sistema abrirá o **hub global do RH**.

## Hub Global do RH
Na tela `/rh`, o RH consegue:
- ver todos os projetos cadastrados
- identificar quais estão abertos e quais já foram finalizados
- abrir o gerenciamento de um projeto específico
- finalizar um projeto aberto
- criar um novo projeto quando não houver outro ciclo em aberto

## Como Funciona a Gestão dos Projetos
O RH trabalha em dois níveis:

- **Hub global**: `/rh`
  Aqui ele escolhe o projeto que deseja administrar.

- **Tela do projeto**: `/{ano}/rh`
  Aqui ele gerencia o ciclo selecionado, importa XML, acompanha os servidores e solicita reavaliação.

## Criar um Novo Ciclo
Use a área de criação de projeto no hub global `/rh`.

### Passos
1. Informe o ano do novo ciclo.
2. Clique em **Novo projeto**.

### O que o sistema faz
- cria o novo ciclo anual
- marca o novo ciclo como ativo
- desativa os ciclos anteriores
- replica a base de perguntas do ciclo mais recente

### Regras importantes
- não é possível criar dois ciclos com o mesmo ano
- o ano deve estar entre `2020` e `2100`
- o RH só pode criar um novo projeto quando **não existir outro projeto aberto**

## Finalizar um Projeto
No hub global `/rh`, cada projeto aberto possui a ação **Finalizar projeto**.

### Regra de finalização
Um projeto só pode ser finalizado quando todas as avaliações atuais do ciclo estiverem com status:

```text
COMPLETED
```

### O que acontece ao finalizar
- o projeto passa para status `COMPLETED`
- ele deixa de ser o projeto ativo
- o RH libera a criação de um novo projeto

## Importar a Base XML
Depois de escolher o projeto desejado no hub global, entre na tela `/{ano}/rh` e use a área **Importação de base XML**.

### Passos
1. Selecione o arquivo XML da base anual.
2. Clique em **Importar XML**.

### O que o XML deve conter
O parser espera campos equivalentes a:
- CPF
- nome
- matrícula
- vínculo
- secretaria
- cargo
- CPF da chefia imediata

### O que o sistema faz na importação
- cria ou atualiza os usuários
- cria ou atualiza o retrato do usuário no ciclo
- identifica quem é chefia no organograma importado
- vincula subordinados às chefias
- cria avaliações pendentes para os servidores do ciclo

### Como o vínculo é interpretado
- se o valor do vínculo contiver `PROB`, o servidor entra como **probatório**
- nos demais casos, entra como **efetivo**

## Acompanhamento das Avaliações
Na tela do projeto, o RH consegue ver:
- nome do servidor
- matrícula
- secretaria
- cargo
- status da avaliação
- versão da avaliação

### Status que podem aparecer
- `PENDING`: avaliação ainda não concluída
- `DRAFT`: servidor salvou rascunho
- `AUTO_DONE`: autoavaliação concluída
- `MANAGER_DONE`: chefia concluiu a parte dela
- `COMPLETED`: fluxo completo encerrado
- `ARCHIVED`: avaliação antiga arquivada por reavaliação

### Indicadores superiores
O painel mostra:
- total de servidores do ciclo
- quantidade de avaliações concluídas
- quantidade de avaliações pendentes

## Solicitar Reavaliação
Na última coluna da tabela existe o botão **Solicitar reavaliação**.

### O que acontece ao clicar
O sistema executa uma reabertura segura da avaliação:
- a avaliação atual é arquivada
- uma nova avaliação é criada
- a nova avaliação recebe versão seguinte
- a autoavaliação do servidor é reaproveitada
- os documentos enviados pelo servidor são reaproveitados
- o novo fluxo volta pronto apenas para a **chefia** refazer a avaliação

### Efeito prático
Após a reavaliação:
- o histórico anterior é preservado
- o servidor **não** faz nova autoavaliação
- apenas a chefia refaz o parecer em uma nova versão

## Regras de Negócio Relevantes para o RH

### Tipos de servidor
- **Efetivo**: formulário com 8 fatores e base de 60 pontos
- **Probatório**: formulário com 5 fatores e base de 50 pontos

### Liberação da chefia
- para **efetivo**, a chefia só pode avaliar depois da autoavaliação
- para **probatório**, a chefia também só pode avaliar depois da autoavaliação

### Bloqueio de edição
Depois da conclusão do fluxo:
- o formulário fica bloqueado
- nova edição só acontece se o RH solicitar reavaliação

### Prazos
O sistema foi estruturado com estas regras:
- autoavaliação: 15 dias
- chefia: 17 dias

## Upload de Comprovantes
Os comprovantes são enviados no formulário do servidor e ficam vinculados à avaliação.

### Regras atuais
- apenas arquivos PDF
- até 10 arquivos por servidor
- até 10 MB por arquivo

### Onde os arquivos são gravados
Os arquivos são enviados para o **Google Drive** usando a service account configurada no projeto.

### Estrutura de pastas
O sistema cria automaticamente:
1. pasta do ciclo
2. subpasta do servidor com nome e matrícula
3. arquivos PDF dentro dessa subpasta

## Configuração do Google Drive
Para o RH ou responsável técnico validar o destino dos arquivos, estas variáveis são usadas:

```env
GOOGLE_DRIVE_CREDENTIALS_FILE
GOOGLE_DRIVE_ROOT_FOLDER_ID
GOOGLE_DRIVE_SHARED_DRIVE_ID
GOOGLE_DRIVE_CYCLE_PREFIX
```

### Observação importante
Os arquivos não aparecem automaticamente na conta pessoal do usuário RH, a menos que:
- a pasta raiz esteja compartilhada com essa conta
- ou a gravação ocorra em um Shared Drive ao qual essa conta tenha acesso

## Boas Práticas Operacionais
- sempre crie o projeto no hub global antes da importação do XML
- finalize oficialmente um projeto antes de abrir o próximo
- valide o ano do ciclo antes de distribuir o link
- confirme se o XML contém a chefia imediata corretamente
- teste um acesso RH, um acesso de chefia e um acesso de servidor no início do ciclo
- confirme o destino do Google Drive antes de liberar o uso oficial

## Erros Comuns e Como Resolver

### "Já existe um ciclo para esse ano"
Significa que o ciclo já foi criado anteriormente.

### "Finalize o projeto X antes de criar um novo ciclo"
Existe um projeto ainda aberto. O RH deve concluí-lo antes de abrir o próximo.

### "Nenhum registro reconhecido no XML"
O arquivo não contém os campos esperados pelo parser ou a estrutura veio diferente do padrão.

### "Apenas arquivos PDF são permitidos"
O servidor tentou enviar arquivo fora do formato PDF.

### "Limite máximo de 10 comprovantes por servidor"
O número máximo de anexos para aquela avaliação foi atingido.

### Usuário não entra no ciclo
Verifique:
- se o CPF está correto
- se ele está importado no XML do ciclo
- se o ciclo acessado é o ano correto

### RH não precisa entrar por ano
O acesso principal do RH é:

```text
/rh/login
```

Depois disso, ele escolhe no hub qual projeto quer administrar.

## Ambiente de Desenvolvimento
Se o RH estiver validando junto com a equipe técnica no ambiente local:

```bash
npm run dev
```

Para recriar o banco local de testes:

```bash
npm run db:push
npm run db:seed
```

## Credenciais de Exemplo do Seed
No ambiente de teste atual:
- RH: `12345678903`
- Chefia: `12345678902`
- Servidor efetivo: `12345678900`
- Servidor probatório: `12345678901`

Senha inicial em todos os casos:

```text
o próprio CPF
```

## Resumo do Fluxo do RH
1. Entrar em `/rh/login`.
2. Abrir o hub global `/rh`.
3. Criar um novo projeto, se não houver ciclo aberto.
4. Escolher o projeto que deseja administrar.
5. Importar a base XML do projeto.
6. Validar o link do ciclo para os usuários.
7. Acompanhar os status no painel do projeto.
8. Solicitar reavaliação quando necessário.
9. Finalizar o projeto quando tudo estiver concluído.
10. Confirmar que os comprovantes estão chegando no Google Drive.
