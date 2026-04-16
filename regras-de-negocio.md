Entendido. Para garantir que o sistema seja blindado contra inconsistências, fraudes ou erros de uso, elaborei este documento com uma abordagem de **"Tolerância Zero"** para o comportamento do software. 

Este documento de Regras de Negócio Estritas (Hard Rules) define os limites arquiteturais e lógicos que o programador deve implementar obrigatoriamente.

---

# DOCUMENTO RESTRITIVO DE REGRAS DE NEGÓCIO (HARD RULES)
**Sistema Nomos de Avaliação de Desempenho**

### 1. Regras de Autenticação e Sessão
* [cite_start]**RN-01.1 (Credenciais Restritas):** O acesso ao sistema exige estritamente a combinação do CPF do servidor como Login e o CPF como Senha Inicial[cite: 20, 21].
* **RN-01.2 (Isolamento de Ciclo):** O acesso do usuário é validado exclusivamente contra a base de dados importada (XML) para o ciclo/ano vigente. Servidores não constantes no XML daquele projeto estão sumariamente bloqueados.

### 2. Regras de Unicidade e Preenchimento (Imutabilidade)
* **RN-02.1 (Submissão Única):** Um servidor (efetivo ou probatório) só pode realizar o envio definitivo de sua autoavaliação **uma única vez** por ciclo. Não existe botão de "desfazer" ou "editar" no painel do servidor após a confirmação.
* **RN-02.2 (Preenchimento Integral):** O sistema proíbe o envio do formulário se houver qualquer fator sem resposta (Nulo). Todos os 5 fatores (Probatório) ou 8 fatores (Efetivo) são de preenchimento obrigatório.
* **RN-02.3 (Preservação de Dados / Rascunho):** O sistema deve gravar o progresso automaticamente no banco de dados. Se a sessão expirar, o rascunho deve ser carregado intacto no próximo login, desde que não tenha sido enviado definitivamente.

### 3. Regras de Fluxo, Travas e Dependências
* **RN-03.1 (Bloqueio de Avaliação - Todos os Servidores):** O botão para a Chefia avaliar qualquer servidor — seja Efetivo ou Probatório — deve permanecer **inativo/bloqueado** até que o banco de dados registre o envio definitivo da autoavaliação por parte daquele subordinado. Não há avaliação da chefia sem autoavaliação prévia do avaliado.
* **RN-03.2 (Trava de Segurança Master):** Assim que a Chefia confirmar o envio de sua avaliação, o registro inteiro daquele servidor naquele ciclo entra em estado `READ-ONLY` (Somente Leitura). Novas edições ou envios para aquele ciclo ficam bloqueados para o servidor e para a chefia. Esta restrição não se aplica ao fluxo de Reavaliação acionado pelo Administrador (RH), conforme RN-07.

### 4. Regras de Prazos (Congelamento Temporal)
* **RN-04.0 (Marco Zero):** Todos os prazos são contados em **dias corridos** a partir da **data de abertura oficial do projeto (ciclo)**, registrada no sistema pelo Administrador (RH) no ato da importação do XML. O fuso horário de referência é **GMT-3 (Brasília)** para todos os cortes de 23:59.
* **RN-04.1 (Limite do Servidor):** O servidor tem um limite estrito de **15 dias corridos** a partir da data de abertura do projeto para concluir a autoavaliação. Após as 23:59 do 15º dia (GMT-3), o acesso ao formulário é bloqueado permanentemente para aquele ciclo.
* **RN-04.2 (Limite da Chefia):** A chefia tem o limite estrito de **17 dias corridos** a partir da data de abertura do projeto para realizar sua avaliação. Após as 23:59 do 17º dia (GMT-3), a tabela de subordinados perde os botões de ação. Consequência conhecida e aceita: para Efetivos que enviarem a autoavaliação próximo ao 15º dia, o tempo efetivamente disponível para a chefia pode ser inferior a 2 dias.

### 5. Motor de Cálculo e Restrições Matemáticas
* [cite_start]**RN-05.1 (Matemática Efetivos - Base 60):** O formulário exige exatamente 8 fatores[cite: 24, 38]. O sistema deve processar os seguintes valores exatos e não editáveis: A=7,50; B=6,00; C=4,00; D=2,25; [cite_start]E=0,75[cite: 37, 106].
* [cite_start]**RN-05.2 (Matemática Probatórios - Base 50):** O formulário exige exatamente 5 fatores[cite: 3, 13]. O sistema deve processar os seguintes valores exatos: A=10; B=8; C=6; D=3; [cite_start]E=1[cite: 12, 59].
* **RN-05.3 (Enquadramento Obrigatório):** A soma das pontuações deve obrigatoriamente classificar o servidor em uma destas chaves exclusivas. Todos os fatores têm peso igual (1). O cálculo é autoritativo no backend. Notação: `[` = inclui o valor; `[` no fechamento = exclui o valor:
    * **SD:** ≥ 90% → Efetivo: **[54,00 ; 60,00]** pts / Probatório: **[45,00 ; 50,00]** pts.
    * **AD:** ≥ 70% e < 90% → Efetivo: **[42,00 ; 54,00[** pts / Probatório: **[35,00 ; 45,00[** pts.
    * **AP:** ≥ 40% e < 70% → Efetivo: **[24,00 ; 42,00[** pts / Probatório: **[20,00 ; 35,00[** pts.
    * **NA:** < 40% → Efetivo: **abaixo de 24,00 pts** / Probatório: **abaixo de 20,00 pts**.

### 6. Regras de Master GED (Upload de Arquivos)
* **RN-06.1 (Bloqueio de Extensão e Tamanho):** O sistema proíbe categoricamente o upload de qualquer formato que não seja `.pdf`. O tamanho máximo por arquivo é de **20 MB**. Arquivos que excedam esse limite devem ser rejeitados com mensagem de erro clara antes do envio.
* **RN-06.2 (Limite de Quantidade):** O sistema aceitará o envio de no máximo 10 arquivos (links) por formulário submetido.
* **RN-06.3 (Destino Estruturado):** O sistema é obrigado a criar uma pasta no Google Drive com o nome exato do servidor (conforme cadastro funcional) antes de depositar os PDFs. Exemplo: `"João da Silva Pereira"`. Não é incluída matrícula no nome da pasta.

### 7. Regras de Reavaliação (Controle do RH)
* **RN-07.1 (Monopólio da Reavaliação):** Apenas o perfil Administrador (RH) tem permissão de sistema para acionar o gatilho de "Reavaliação". O acionamento ocorre quando o RH identificar discrepância significativa entre a autoavaliação do servidor e a avaliação da chefia. O sistema **não verifica nem aciona esse processo automaticamente** — a decisão é exclusivamente humana (RH).
* **RN-07.2 (Preservação de Histórico):** A ação de Reavaliação proíbe a sobreposição de dados. O sistema deve registrar permanentemente tanto a **primeira avaliação da chefia** quanto a **segunda avaliação (reavaliação)**, ambas vinculadas ao mesmo ciclo e servidor. A avaliação original da chefia é marcada como `HISTÓRICO_INATIVO` e permanece visível para o Administrador (RH) em relatórios de auditoria.
* **RN-07.3 (Escopo da Reavaliação):** Na reavaliação, **apenas a Chefia preenche novamente** seu formulário de avaliação. O servidor não realiza nova autoavaliação. A autoavaliação original permanece intacta e em `READ-ONLY`.
* **RN-07.4 (Prazo da Reavaliação):** A chefia tem **17 dias corridos** a partir da data de abertura oficial do projeto (mesmo marco zero de RN-04.0) para concluir a reavaliação. Após 23:59 do 17º dia (GMT-3), o acesso da chefia ao formulário de reavaliação é bloqueado.