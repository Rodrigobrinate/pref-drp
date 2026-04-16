Com o design pronto, o próximo passo crítico é traduzir as telas e fluxos em um documento técnico para a equipe de desenvolvimento. Este documento servirá como o "norte" para a modelagem do banco de dados (Prisma) e a construção da lógica no Next.js.

Aqui está o **Documento de Análise de Requisitos e Regras de Negócio** focado diretamente nas necessidades do programador.

---

# Documento de Análise de Requisitos - Sistema Nomos de Avaliação de Desempenho

## 1. Visão Geral do Projeto
O sistema visa informatizar o ciclo anual de Avaliação de Desempenho dos servidores municipais. O acesso será feito via link dinâmico gerado anualmente (ex: `/projeto/2026/login`). O sistema elimina o uso de papel, automatiza os cálculos de pontuação (Base 50 para probatórios e Base 60 para efetivos) e integra o armazenamento de certificados diretamente ao Google Drive (Master GED).

## 2. Perfis de Acesso (Atores)
1. **Administrador (RH):** Cria os ciclos anuais, importa a base de dados via XML, gera links de acesso e monitora o status geral da prefeitura. Pode solicitar reavaliações.
2. **Chefia Imediata (Avaliador):** Acessa um painel com a lista de seus subordinados diretos. Realiza a avaliação de sua equipe, respeitando as travas de liberação.
3. **Servidor Efetivo (Avaliado):** Acessa o sistema para preencher exclusivamente sua Autoavaliação e enviar comprovantes de capacitação.
4. **Servidor Probatório (Avaliado):** Acessa o sistema para realizar sua Autoavaliação com base em fatores reduzidos (5 fatores).

---

## 3. Requisitos Funcionais (RF) - O que o sistema deve fazer

* [cite_start]**RF01 - Gestão de Ciclos:** O sistema deve permitir que o RH crie um novo projeto anual (ex: "Ciclo 2026")[cite: 13, 21].
* **RF02 - Importação de Usuários:** O sistema deve processar um arquivo XML (upload) contendo a relação de servidores, matrículas, cargos, vínculo (Efetivo/Probatório), secretaria e qual é a chefia imediata associada a cada um naquele ciclo.
* [cite_start]**RF03 - Autenticação Contextual:** O login deve ser feito usando CPF (Login) e CPF (Senha Inicial)[cite: 19, 20, 21]. Após o login, o sistema deve rotear o usuário para a tela correta com base no seu perfil e no ciclo atual.
* [cite_start]**RF04 - Formulário Dinâmico:** O sistema deve renderizar o formulário de avaliação de forma dinâmica, carregando as perguntas (8 fatores para efetivos, 5 para probatórios) diretamente do banco de dados[cite: 3, 4, 23, 24].
* **RF05 - Upload de Arquivos (GED):** O sistema deve permitir anexar arquivos PDF (até 10MB) no final do formulário (para Efetivos). [cite_start]Os arquivos devem ser enviados via API para o Google Drive e o link salvo no banco de dados[cite: 50, 51, 52, 113, 115].
* [cite_start]**RF06 - Painel da Chefia:** A chefia deve visualizar uma tabela com seus subordinados, exibindo o status atualizado (ícones visuais) de quem já preencheu a autoavaliação[cite: 45, 46].
* **RF07 - Reavaliação (Cópia de Registro):** O RH deve ter um botão para acionar reavaliação. [cite_start]Isso deve duplicar a linha da avaliação no banco de dados (marcando a anterior como arquivada/histórico) e reabrir o status para "Pendente" no painel da chefia[cite: 47, 48, 49, 123, 124, 125, 126, 127].

---

## 4. Regras de Negócio (RN) - As lógicas e travas matemáticas

* [cite_start]**RN01 - Bloqueio de Edição (Trava de Segurança):** O sistema deve bloquear qualquer edição em uma avaliação após a conclusão do fluxo (Autoavaliação concluída + Avaliação da Chefia concluída)[cite: 44].
* [cite_start]**RN02 - Dependência de Preenchimento (Efetivos):** O botão "Avaliar" no painel da chefia para um servidor **Efetivo** só pode ser habilitado após o servidor finalizar e enviar sua Autoavaliação[cite: 44].
* **RN03 - Independência de Preenchimento (Probatórios):** O botão "Avaliar" da chefia para um servidor **Probatório** fica liberado desde o primeiro dia do ciclo, independentemente da autoavaliação do servidor.
* **RN04 - Cálculo de Pontuação (Servidor Efetivo - Base 60):**
    * [cite_start]Fatores: 8 (Disciplina, Iniciativa, Produtividade, Responsabilidade, Controle Emocional, Cooperação, Comprometimento, Relações Interpessoais)[cite: 24, 26, 27, 28, 29, 30, 31, 32, 33, 34].
    * Pesos das Alternativas: A = 7,50 | B = 6,00 | C = 4,00 | D = 2,25 | [cite_start]E = 0,75[cite: 36, 37].
    * [cite_start]Teto: 60 pontos[cite: 38].
* **RN05 - Cálculo de Pontuação (Estágio Probatório - Base 50):**
    * [cite_start]Fatores: 5 (Assiduidade, Disciplina, Iniciativa, Produtividade, Responsabilidade)[cite: 3, 4, 5, 6, 7, 8, 9].
    * Pesos das Alternativas: A = 10,00 | B = 8,00 | C = 6,00 | D = 3,00 | [cite_start]E = 1,00[cite: 11, 12].
    * [cite_start]Teto: 50 pontos[cite: 13].
* **RN06 - Controle de Prazos:** O sistema deve exibir um cronômetro regressivo. [cite_start]Prazo para autoavaliação é de 15 dias corridos; prazo para a chefia é de 17 dias corridos[cite: 42, 43, 121, 122].

---

## 5. Sugestão de Arquitetura de Dados (Prisma / SQL)

Para o desenvolvedor back-end, recomendo a seguinte modelagem relacional para suportar o contexto de "projetos anuais" e evitar que mudanças no organograma quebrem o histórico:

* **`User`**: Dados estáticos do indivíduo (ID, CPF, Nome, Matrícula, Senha Hash).
* **`Cycle`**: O projeto anual (ID, Ano, Data_Inicio, Data_Fim, Status Ativo/Inativo).
* **`UserCycle` (Pivot Crítica):** Tabela que liga o Usuário ao Ciclo. Armazena o "retrato" daquele ano: `role` (Efetivo/Probatório), `department`, `job_title`, e `manager_id` (relacionamento com outro UserCycle). É aqui que o XML faz o upsert.
* **`Question` & `Option`**: Tabelas de domínio para guardar o texto das perguntas e alternativas. O campo `type` define se a pergunta é para `BASE_50` ou `BASE_60`.
* **`Evaluation`**: Guarda o resultado. Possui campos como `status` (PENDING, AUTO_DONE, MANAGER_DONE, COMPLETED), `auto_score`, `manager_score`, `final_score`, e as datas de envio. Relaciona-se com `UserCycle`.
* **`Document`**: Armazena os links do GDrive (ID, URL, Evaluation_ID).

---

## 6. Diretrizes Técnicas Adicionais (Stack Next.js)

1.  **Uploads via Server Actions:** Ao anexar o PDF do certificado, não espere o envio de todo o formulário. Use Server Actions no Next.js para fazer o upload assíncrono para o GDrive assim que o usuário soltar o arquivo na zona de *drop*. Salve o link temporário no estado do React (ou draft no DB) e apenas anexe o ID final no `submit` da avaliação. Isso evita timeouts em conexões lentas.
2.  **Banco de Dados como Fonte da Verdade (Formulários):** Oriente o programador a **não** "chumbar" (hardcode) os textos das 8 ou 5 perguntas no front-end. O back-end deve expor uma rota/ação que retorna o JSON do formulário baseado no vínculo do servidor. Se a Prefeitura alterar uma vírgula na lei no ano que vem, basta atualizar o banco de dados.
3.  **Transações Seguras:** A ação de "Solicitar Reavaliação" (RH) deve rodar dentro de uma `$transaction` no Prisma para garantir que a cópia da avaliação e a atualização de status da avaliação antiga ocorram de forma atômica (tudo ou nada).


Este documento complementa a análise anterior, focando exclusivamente nas funcionalidades de persistência de dados e na estrutura avançada de integração com o sistema de arquivos em nuvem.

### Documento de Especificações Técnicas Complementares

#### 1. Gerenciamento de Arquivos e Integração Google Drive (Master GED)
Diferente de um upload simples, a integração deve seguir uma hierarquia organizacional rígida para facilitar a auditoria pelo RH.

* [cite_start]**RF08 - Multi-upload de Comprovantes (Somente PDF):** O componente de upload deve aceitar múltiplos arquivos simultaneamente[cite: 52, 115].
    * **Restrição:** O sistema deve validar o MIME type no frontend e backend, bloqueando qualquer arquivo que não seja `.pdf`.
    * [cite_start]**Limite:** Suporte para até 10 arquivos por servidor (conforme diretriz de 10 links no GED)[cite: 115].
* **RF09 - Estrutura Dinâmica de Pastas no Drive:** O backend não deve apenas "jogar" o arquivo no Drive. A integração deve:
    1.  Localizar a pasta raiz do Ciclo (ex: "Avaliação 2026").
    2.  Verificar a existência ou criar uma subpasta com o **Nome Completo e Matrícula** do servidor.
    3.  Salvar todos os arquivos enviados por aquele usuário dentro desta pasta específica.
    4.  Retornar os IDs/Links do Google Drive para serem armazenados na tabela `Documents` do banco de dados, vinculados à avaliação.

#### 2. Persistência e Resiliência (Auto-save)
Para evitar perda de dados em formulários extensos (especialmente os de 8 fatores para efetivos), o sistema deve garantir que o progresso não seja perdido.

* **RF10 - Mecanismo de Auto-save (Rascunho):**
    * **Trigger:** O sistema deve realizar um "silent submit" (salvamento em segundo plano) sempre que o usuário alternar entre as seções do formulário ou após um período de inatividade (debounce de 5-10 segundos após a última interação).
    * **Estado do Banco:** Deve existir um status de avaliação chamado `DRAFT`. Enquanto estiver neste status, o servidor pode entrar e sair do sistema sem perder as notas já atribuídas.
    * **Recuperação de Sessão:** Ao fazer login, se existir um `DRAFT` para aquele `UserCycle`, o sistema deve carregar os dados automaticamente para o formulário.
* **RF11 - Validação de Checklist pré-envio:** O botão de "Concluir e Enviar" só deve ser habilitado se todos os fatores obrigatórios estiverem preenchidos e o auto-save tiver confirmado a persistência da última alteração.

#### 3. Requisitos Não Funcionais para o Desenvolvedor
* **Sincronização de Arquivos:** O upload para o Google Drive deve ser tratado como um processo assíncrono (Queue/Job). Se o Drive falhar momentaneamente, o sistema deve tentar novamente sem bloquear a experiência do usuário.
* **Interface de Feedback:** Exibir um indicador visual discreto (ex: "Alterações salvas automaticamente") para dar segurança ao servidor de que o rascunho está seguro.

#### 4. Resumo da Lógica de Negócio Adicional
* [cite_start]**Prazos:** O sistema deve honrar os 15 dias para autoavaliação e 17 para a chefia[cite: 42, 43, 121, 122]. O auto-save é desabilitado e o rascunho é "congelado" se o prazo expirar antes do envio definitivo.
* [cite_start]**Trava Pós-Envio:** Após o envio definitivo (fim do status DRAFT), o formulário torna-se `READ-ONLY` (somente leitura), a menos que o RH acione o botão de reavaliação[cite: 44, 123].