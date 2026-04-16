const QUESTION_BANK_DATA = {
  BASE_60: [
    {
      title: "Disciplina",
      description:
        "Considere se o servidor observa sistematicamente aos regulamentos e às normas emanadas das autoridades.",
      options: [
        "Sempre cumpre as normas e deveres, além de contribuir para a manutenção da ordem no ambiente de trabalho.",
        "Mantém um comportamento satisfatório atendendo às normas e deveres da unidade.",
        "Mantém um comportamento satisfatório, mas não atende às normas e deveres da unidade.",
        "Eventualmente descumpre as determinações que lhes são atribuídas e tem um comportamento instável no grupo.",
        "Mostra-se resistente a cumprir normas e deveres e sempre influencia negativamente no comportamento do grupo.",
      ],
    },
    {
      title: "Iniciativa",
      description:
        "Considere se o servidor adota providências em situações não definidas pela chefia ou não previstas nos manuais ou normas de serviço.",
      options: [
        "Tem facilidade em buscar soluções para situações imprevistas do trabalho, quando solicitado.",
        "Esforça-se para solucionar algumas situações imprevistas na execução do trabalho.",
        "Eventualmente apresenta soluções para situações imprevistas do trabalho, quando solicitado.",
        "Mostra pouco interesse em solucionar problemas decorrentes de situações imprevistas na execução do trabalho.",
        "Deixa de solucionar problemas decorrentes de situações imprevistas na execução do trabalho.",
      ],
    },
    {
      title: "Produtividade",
      description:
        "Considere se o servidor apresenta volume e qualidade de trabalho num intervalo de tempo satisfatório.",
      options: [
        "Ultrapassa o volume de trabalho exigido, entregando as tarefas antes dos prazos estabelecidos e com qualidade.",
        "Apresenta resultados satisfatórios, entregando as tarefas dentro dos prazos estabelecidos.",
        "Apresenta pouco resultado para o trabalho exigido, e não cumpre os prazos estabelecidos devido a pouco conhecimento dos serviços.",
        "Apresenta resultados para o trabalho exigido, porém não cumpre os prazos estabelecidos.",
        "Demonstra resultados abaixo do exigido e as tarefas são sempre entregues fora dos prazos previstos.",
      ],
    },
    {
      title: "Responsabilidade",
      description:
        "Considere o comprometimento com suas tarefas, com as metas estabelecidas pelo órgão ou entidade e com o bom conceito da administração pública do Municipio.",
      options: [
        "Conhece suas atribuições executando suas atividades acima das expectativas, antecipando-se às solicitações.",
        "Executa adequadamente as suas atividades de acordo com as metas estabelecidas para a unidade.",
        "Em algumas situações demonstra pouca atenção em relação a execução das atribuições do seu cargo.",
        "Não cumpre adequadamente suas atribuições demonstrando pouca atenção necessitando de permanente orientação e controle.",
        "È descuidado demonstra nenhuma atenção às suas atribuições, descumprindo as orientações dos serviços, causando prejuízos.",
      ],
    },
    {
      title: "Controle Emocional",
      description:
        "Considere a capacidade de manter o equilíbrio emocional diante de situações adversas.",
      options: [
        "Mantêm o equilíbrio emocional diante das mais adversas situações. Demonstra capacidade de solucionar qualquer problema sem perder a calma. Jamais perde o equilíbrio com chefias, subordinados ou colegas de trabalho.",
        "É equilibrado emocionalmente, Mas diante de algumas situações reage com insensatez na resolução do problema. Age com equilíbrio no trato com chefes, subordinados ou colegas de trabalho.",
        "É equilibrado emocionalmente, Mas diante de algumas situações reage com total Insensatez na resolução do problema. Demonstra pouco equilíbrio no trato com chefes, subordinados ou colegas de trabalho.",
        "Constantemente age com desequilíbrio emocional. Nem sempre age com equilíbrio no trato com chefes, subordinados ou colegas de trabalho.",
        "Age sempre com desequilíbrio emocional principalmente no trato com as pessoas prejudicando as atividades que desenvolve trazendo prejuízos para administração.",
      ],
    },
    {
      title: "Cooperação",
      description:
        "Considere a disposição colaborar para independentemente de solicitação de demanda.",
      options: [
        "Demonstra em seus atos, comportamentos e atitudes de colaboração com os superiores, subordinados e colegas de trabalho independente de demanda e ou determinação.",
        "Se solicitado demonstra em seus atos, comportamentos e atitudes de colaboração com os superiores, subordinados e colegas de trabalho independente de demanda e ou determinação.",
        "Dependendo da demanda e ou determinação, se solicitado demonstra em seus atos, comportamentos e atitudes de colaboração com os superiores subordinados e colegas de trabalho.",
        "Na maioria das vezes não coopera com as solicitações.",
        "Não coopera e ainda tenta impedir que outros cooperem quando solicitado.",
      ],
    },
    {
      title: "Comprometimento",
      description:
        "Considere se o servidor é comprometido com suas tarefas, com as metas estabelecidas pelo órgão ou entidade e com o bom conceito da administração pública do Município.",
      options: [
        "Conhece suas atribuições executando suas atividades acima das expectativas antecipando-se às solicitações.",
        "Executa adequadamente as suas atividades de acordo com as metas estabelecidas para a unidade.",
        "Em algumas situações demonstra pouca atenção em relação a execução das atribuições do seu cargo.",
        "Não cumpre adequadamente suas atribuições demonstrando pouca atenção necessitando de permanente orientação e controle.",
        "È descuidado demonstra nenhuma atenção às suas atribuições, descumprindo as orientações dos serviços, causando prejuízos.",
      ],
    },
    {
      title: "Relações Interpessoais",
      description:
        "Considere a capacidade de manter relações humanas saudáveis e construtivas.",
      options: [
        "É capaz de manter relações humanas saudáveis e construtivas, visando proporcionar ao grupo um ambiente harmonioso tendo em vista a execução integrada do trabalho.",
        "Se integra bem ao grupo e consegue manter boa as relações interpessoais.",
        "Eventualmente se integra bem ao grupo e consegue manter boa as relações interpessoais.",
        "Se integra com dificuldade ao grupo e nem sempre consegue manter boa as relações interpessoal.",
        "Não se integra ao grupo e tenta desequilibrar o relacionamento dos integrantes dos grupos que com ele se relacionam.",
      ],
    },
  ],
  BASE_50: [
    {
      title: "Assiduidade e Pontualidade",
      description:
        "Presença do servidor no local de trabalho dentro do horário estabelecido para o expediente da unidade.",
      options: [
        "Cumpre o horário e é pontual estando sempre presente, mostrando-se disposto a atender às necessidades de trabalho e domina o serviço previamente estabelecido.",
        "Cumpre o horário estabelecido e é pontual nos seus compromissos de trabalho, tem pouca disponibilidade e domina o serviço previamente estabelecido.",
        "Normalmente não cumpre o horário estabelecido, mas, quando presente, atende às necessidades de trabalho.",
        "Normalmente não cumpre o horário estabelecido, e não domina o serviço previamente estabelecido.",
        "Nunca cumpre horário e está sempre ausente.",
      ],
    },
    {
      title: "Disciplina",
      description:
        "Observa sistematicamente aos regulamentos e às normas emanadas das autoridades competentes.",
      options: [
        "Sempre cumpre as normas e deveres, além de contribuir para a manutenção da ordem no ambiente de trabalho.",
        "Mantém um comportamento satisfatório atendendo às normas e deveres da unidade.",
        "Mantém um comportamento satisfatório, mas não atende às normas e deveres da unidade.",
        "Eventualmente descumpre as determinações que lhes são atribuídas e tem um comportamento instável no grupo.",
        "Mostra-se resistente a cumprir normas e deveres e sempre influencia negativamente no comportamento do grupo.",
      ],
    },
    {
      title: "Eficiência",
      description:
        'Adota providências em situações não definidas pela chefia ou não previstas nos manuais ou normas. (Nota: No documento Word este fator é chamado de "Iniciativa", mas na ficha em PDF consta como "Eficiência")',
      options: [
        "Tem facilidade em buscar soluções para situações imprevistas do trabalho, quando solicitado.",
        "Esforça-se para solucionar algumas situações imprevistas na execução do trabalho.",
        "Eventualmente apresenta soluções para situações imprevistas do trabalho, quando solicitado.",
        "Mostra pouco interesse em solucionar problemas decorrentes de situações imprevistas na execução do trabalho.",
        "Deixa de solucionar problemas decorrentes de situações imprevistas na execução do trabalho.",
      ],
    },
    {
      title: "Produtividade",
      description:
        "Apresenta volume e qualidade de trabalho num intervalo de tempo satisfatório.",
      options: [
        "Ultrapassa o volume de trabalho exigido, entregando as tarefas antes dos prazos estabelecidos e com qualidade.",
        "Apresenta resultados satisfatórios, entregando as tarefas dentro dos prazos estabelecidos.",
        "Apresenta pouco resultado para o trabalho exigido, e não cumpre os prazos estabelecidos devido a pouco conhecimento dos serviços.",
        "Apresenta resultados para o trabalho exigido, porém não cumpre os prazos estabelecidos.",
        "Demonstra resultados abaixo do exigido e as tarefas são sempre entregues fora dos prazos previstos.",
      ],
    },
    {
      title: "Responsabilidade",
      description:
        "É comprometido com suas tarefas, com as metas estabelecidas pelo órgão ou entidade e com o bom conceito da administração pública Municipal.",
      options: [
        "Conhece suas atribuições executando suas atividades acima das expectativas, antecipando-se às solicitações.",
        "Executa adequadamente as suas atividades de acordo com as metas estabelecidas para a unidade.",
        "Em algumas situações demonstra pouca atenção em relação a execução das atribuições do seu cargo.",
        "Não cumpre adequadamente suas atribuições demonstrando pouca atenção necessitando de permanente orientação e controle.",
        "È descuidado demonstra nenhuma atenção às suas atribuições, descumprindo as orientações dos serviços, causando prejuízos.",
      ],
    },
  ],
};

module.exports = {
  QUESTION_BANK_DATA,
};
