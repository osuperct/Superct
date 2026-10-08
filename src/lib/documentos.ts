export const EMAIL_SUPER_CT = "osuper.c.t@gmail.com";
export const BUCKET = "documentos-alunos";

export const TERMO_IMAGEM =
  "Autorizo, de forma gratuita e por prazo indeterminado, o uso da imagem e da voz do(a) aluno(a) em fotos e vídeos captados nas atividades do Super CT, para divulgação nas redes sociais e materiais de comunicação do Super CT, sem qualquer ônus ou contrapartida financeira.";

export type CampoDoc = {
  chave: string;
  rotulo: string;
  longo?: boolean;
  fixo?: string;
  opcoes?: string[];
  multiplos?: { chave: string; rotulo: string; opcoes: string[] }[];
  obrigatorio?: boolean;
  cpf?: boolean;
  date?: boolean;
};

const SIM_NAO = ["Não", "Sim"];

export const CAMPOS_FICHA: CampoDoc[] = [
  { chave: "aluno_nome", rotulo: "Nome completo do aluno" },
  { chave: "aluno_nascimento", rotulo: "Data de nascimento" },
  { chave: "aluno_idade", rotulo: "Idade" },
  { chave: "escola", rotulo: "Escola / série" },
  { chave: "responsavel_nome", rotulo: "Nome do responsável legal" },
  { chave: "responsavel_cpf", rotulo: "CPF do responsável", obrigatorio: true, cpf: true },
  { chave: "responsavel_rg", rotulo: "RG do responsável" },
  { chave: "endereco", rotulo: "Endereço completo" },
  { chave: "telefone", rotulo: "Telefone / WhatsApp", obrigatorio: true },
  { chave: "contato_emergencia", rotulo: "Telefone de emergência (nome e número)" },
  { chave: "parq_1", rotulo: "PAR-Q 1 — Algum médico já disse que o aluno possui problema cardíaco ou restrição para exercícios?", opcoes: SIM_NAO },
  { chave: "parq_2", rotulo: "PAR-Q 2 — O aluno sente dores no peito, falta de ar inexplicável ou tonturas ao se exercitar?", opcoes: SIM_NAO },
  { chave: "parq_3", rotulo: "PAR-Q 3 — Possui algum problema ósseo, articular ou muscular que possa ser agravado pelo exercício?", opcoes: SIM_NAO },
  { chave: "parq_4", rotulo: "PAR-Q 4 — Possui diagnóstico de asma, bronquite ou condição respiratória frequente?", opcoes: SIM_NAO },
  { chave: "parq_5", rotulo: "PAR-Q 5 — O aluno toma algum medicamento de uso contínuo?", opcoes: SIM_NAO },
  { chave: "parq_6", rotulo: "PAR-Q 6 — Existe outro motivo médico/físico para o aluno não realizar exercícios sem adaptação?", opcoes: SIM_NAO },
  { chave: "medicamentos", rotulo: "Medicamentos de uso contínuo (se houver)", longo: true },
  { chave: "alergias", rotulo: "Alergias conhecidas (medicamentos, alimentos, insetos)", longo: true },
  { chave: "saude", rotulo: "Restrições médicas, neurológicas, ortopédicas ou comportamentais", longo: true },
  { chave: "experiencia", rotulo: "Já praticou atividade física ou esportes antes? Quais?", longo: true },
  {
    chave: "objetivo",
    rotulo: "Objetivo principal",
    opcoes: ["Condicionamento físico", "Desenvolvimento motor", "Recreação", "Socialização", "Todos"],
  },
  { chave: "plano", rotulo: "Convênio / plano de saúde" },
];

export const CAMPOS_CONTRATO: CampoDoc[] = [
  { chave: "contratada", rotulo: "Contratada", fixo: "Super CT — Desenvolvimento e Recreação Infantil | CNPJ 61.251.274/0001-48" },
  {
    chave: "profissional",
    rotulo: "Profissional responsável",
    fixo: "Victor Hugo Jorge de Siqueira | CREF 057790-G/MG | CPF 097.854.576-13",
  },
  { chave: "contratante", rotulo: "Nome do responsável legal (contratante)", obrigatorio: true },
  { chave: "cpf", rotulo: "CPF do contratante", obrigatorio: true, cpf: true },
  { chave: "rg", rotulo: "RG do contratante" },
  { chave: "telefone", rotulo: "Telefone / WhatsApp", obrigatorio: true },
  { chave: "endereco", rotulo: "Endereço completo" },
  { chave: "aluno", rotulo: "Nome do aluno(a)", obrigatorio: true },
  { chave: "aluno_nascimento", rotulo: "Data de nascimento do aluno" },
  { chave: "servico", rotulo: "Serviço contratado (modalidade / evento)", fixo: "Treinamento funcional e recreação" },
  { chave: "data_inicio", rotulo: "Data de início", date: true, obrigatorio: true },
  { chave: "matricula", rotulo: "Taxa de matrícula / cadastro (R$)", fixo: "R$ 50,00" },
  {
    chave: "dias_horarios",
    rotulo: "Dias e horários",
    multiplos: [
      { chave: "dias", rotulo: "Dias", opcoes: ["1x na semana", "2x na semana", "Todos os dias"] },
      { chave: "horario", rotulo: "Horário", opcoes: ["Turma Manhã", "Turma Tarde", "Turma Noite"] },
    ],
  },
  {
    chave: "valor",
    rotulo: "Valor da mensalidade (R$)",
    obrigatorio: true,
    opcoes: [
      "Plano mensal R$185,00",
      "Plano Recorrente R$160,00",
      "Plano 1x na semana R$135,00",
      "Plano 2x na semana R$150,00",
      "Plano anual 12x de R$140,00",
      "Plano semestral 6x de R$150,00",
    ],
  },
  { chave: "forma_pagamento", rotulo: "Forma de pagamento", opcoes: ["Pix", "Dinheiro", "Cartão", "Cartão Recorrente (link)"] },
  { chave: "observacoes", rotulo: "Observações", longo: true },
];

export type TipoDoc = "ficha" | "contrato";

/** Cláusulas do Contrato Misto de Prestação de Serviços do Super CT. */
export const CLAUSULAS_CONTRATO: { titulo: string; texto: string }[] = [
  {
    titulo: "CLÁUSULA 1ª — DO OBJETO DO CONTRATO",
    texto:
      "O presente contrato tem como objeto a prestação integrada de serviços de treinamento infantil, recreação esportiva, desenvolvimento motor, treinamento funcional, jogos lúdicos, escalada e atividades esportivas oferecidas nas dependências do Super CT.",
  },
  {
    titulo: "CLÁUSULA 2ª — DA ATUAÇÃO TÉCNICA E SAÚDE",
    texto:
      "2.1. A orientação técnica, prescrição dos exercícios funcionais e acompanhamento do desenvolvimento motor são de responsabilidade profissional exclusiva do Prof. Victor Hugo Jorge de Siqueira (CREF 057790-G/MG | CPF 097.854.576-13). 2.2. O RESPONSÁVEL LEGAL declara que o aluno possui condições físicas e médicas adequadas para a participação nas atividades. 2.3. O RESPONSÁVEL LEGAL compromete-se a preencher a Ficha de Anamnese e PAR-Q (anexo a este instrumento) e a comunicar previamente qualquer limitação física, médica ou comportamental relevante.",
  },
  {
    titulo: "CLÁUSULA 3ª — HORÁRIOS E FUNCIONAMENTO",
    texto:
      "O aluno frequentará as atividades nos dias e horários indicados neste contrato, previamente definidos entre as partes, devendo respeitar o calendário, as normas internas e as orientações dos professores e da coordenação.",
  },
  {
    titulo: "CLÁUSULA 4ª — VALORES, MATRÍCULA E FORMA DE PAGAMENTO",
    texto:
      "4.1. A taxa de matrícula/cadastro indicada neste contrato deverá ser paga no ato da assinatura deste instrumento. 4.2. Pela prestação dos serviços integrados, o CONTRATANTE pagará a mensalidade unificada do plano escolhido, com vencimento no dia do mês correspondente ao da assinatura deste instrumento. 4.3. O pagamento poderá ser efetuado via PIX (chave celular 35988223596) ou via cartão de crédito, conforme acordado entre as partes. 4.4. Os valores poderão ser reajustados anualmente conforme atualização da tabela vigente do CT, mediante comunicação prévia aos responsáveis.",
  },
  {
    titulo: "CLÁUSULA 5ª — INADIMPLÊNCIA E REATIVAÇÃO DE MATRÍCULA",
    texto:
      "5.1. Em caso de atraso na mensalidade, haverá incidência de multa de 2%, juros de 1% ao mês e correção monetária. 5.2. Após 15 (quinze) dias de inadimplência, a participação do aluno poderá ser suspensa; persistindo por mais de 30 (trinta) dias, o contrato poderá ser rescindido unilateralmente. 5.3. Caso o aluno permaneça afastado por período superior a 60 (sessenta) dias consecutivos sem pagamento regular, será considerado desligado; o retorno dependerá de novo cadastro e pagamento de nova taxa de matrícula conforme tabela vigente.",
  },
  {
    titulo: "CLÁUSULA 6ª — REGRAS DE CONVIVÊNCIA E ZELO PATRIMONIAL",
    texto:
      "6.1. O aluno deverá manter comportamento compatível com o ambiente esportivo, educacional e recreativo. 6.2. O RESPONSÁVEL LEGAL compromete-se a orientar o aluno quanto ao uso adequado do espaço e dos equipamentos. Danos causados de forma comprovadamente intencional poderão ser cobrados pelo custo do reparo/substituição; danos decorrentes do uso normal e do desgaste natural não serão cobrados.",
  },
  {
    titulo: "CLÁUSULA 7ª — ADVERTÊNCIAS E MEDIDAS DISCIPLINARES",
    texto:
      "Em casos de indisciplina ou atitudes perigosas, poderão ser aplicadas: (1) advertência verbal; (2) advertência formal aos responsáveis; (3) suspensão temporária; (4) desligamento definitivo do aluno.",
  },
  {
    titulo: "CLÁUSULA 8ª — CANCELAMENTO E RESCISÃO",
    texto:
      "O cancelamento deverá ser solicitado formalmente por escrito pelo RESPONSÁVEL LEGAL com antecedência mínima de 10 (dez) dias. A ausência do aluno não isenta o pagamento das mensalidades sem o cancelamento formal.",
  },
  {
    titulo: "CLÁUSULA — DOS PLANOS SEMESTRAL E ANUAL, CANCELAMENTO E RESCISÃO ANTECIPADA",
    texto: `1. Da vigência e das condições comerciais

A SUPER CT oferece planos de contratação por período determinado, nas modalidades semestral, com vigência de 6 (seis) meses, e anual, com vigência de 12 (doze) meses, contados a partir da data de início estabelecida no contrato.

Os planos poderão oferecer condições comerciais diferenciadas em relação à contratação mensal, em razão do período de permanência contratado, conforme os valores e as condições informados previamente ao CONTRATANTE.

2. Do pedido de cancelamento

O CONTRATANTE poderá solicitar o cancelamento antecipado do plano a qualquer momento, mediante comunicação por escrito à SUPER CT, inclusive por meio eletrônico que permita comprovar a solicitação.

O pedido será registrado com a respectiva data, não podendo o cancelamento ser impedido exclusivamente em razão da existência de parcelas vincendas.

3. Da multa por cancelamento antecipado

Em caso de cancelamento antecipado por iniciativa do CONTRATANTE, sem descumprimento contratual imputável à SUPER CT, poderá ser aplicada multa rescisória de 15% (quinze por cento) sobre o saldo proporcional correspondente ao período contratado ainda não usufruído, observados os limites legais, a proporcionalidade e a vedação de cobrança abusiva.

A multa não incidirá sobre o período já usufruído nem corresponderá automaticamente à cobrança integral dos meses restantes.

4. Do cálculo e da restituição de valores

Para fins de apuração, será considerado o valor total do plano contratado, distribuído proporcionalmente ao período de vigência.

Do valor total pago antecipadamente, será descontado o valor correspondente ao período já usufruído. Sobre o saldo proporcional do período não usufruído será calculada a multa rescisória de 15% (quinze por cento).

Após esse cálculo, eventual saldo positivo em favor do CONTRATANTE será restituído, observados os procedimentos aplicáveis à forma de pagamento utilizada.

A SUPER CT fornecerá, quando solicitado, demonstrativo discriminado dos valores considerados, incluindo o período usufruído, o saldo remanescente, a multa calculada e eventual valor a restituir.

5. Do pagamento por cartão de crédito

Quando o plano semestral ou anual for contratado mediante pagamento do valor total parcelado no cartão de crédito, o parcelamento constituirá forma de pagamento do valor contratado, não representando, por si só, contratação de planos mensais independentes.

O cancelamento não ocasionará automaticamente o estorno das parcelas na fatura. Havendo restituição devida, a SUPER CT adotará as providências cabíveis junto à operadora ou adquirente do cartão, respeitando os direitos do CONTRATANTE.

6. Das hipóteses de cancelamento sem multa

A multa rescisória não será aplicada quando o cancelamento decorrer de descumprimento contratual imputável à SUPER CT ou de outra hipótese em que a legislação assegure ao CONTRATANTE a rescisão sem penalidade.

Nas contratações realizadas fora do estabelecimento comercial, inclusive pela internet, serão respeitados os direitos de arrependimento previstos no artigo 49 do Código de Defesa do Consumidor, quando aplicáveis.

7. Da transparência e da legislação aplicável

As condições de vigência, pagamento, cancelamento e multa serão apresentadas ao CONTRATANTE antes da conclusão da contratação, em linguagem clara e acessível.

Esta cláusula será interpretada em conformidade com o Código de Defesa do Consumidor e demais normas aplicáveis, não prevalecendo qualquer disposição que implique renúncia a direitos legalmente assegurados ao CONTRATANTE.`,
  },
  {
    titulo: "CLÁUSULA 9ª — COLÔNIA DE FÉRIAS E REMANEJAMENTO",
    texto:
      "Durante os períodos de férias escolares, o Super CT realiza 2 (dois) eventos de Colônia de Férias (programação especial não inclusa na mensalidade regular, facultativa mediante aquisição de ingresso). Nesses períodos, das 13h00 às 17h00, os horários regulares do turno da tarde poderão ser temporariamente reajustados para o turno da manhã ou após as 17h00.",
  },
  {
    titulo: "CLÁUSULA 10ª — AUTORIZAÇÃO DE USO DE IMAGEM",
    texto: TERMO_IMAGEM,
  },
  {
    titulo: "CLÁUSULA 11ª — FORO",
    texto:
      "Fica eleito o foro da comarca de São Sebastião do Paraíso — MG. Ao assinar eletronicamente, o CONTRATANTE declara ter lido e concordado integralmente com estas cláusulas.",
  },
];

/** Declaração final da Ficha de Anamnese e PAR-Q. */
export const DECLARACAO_FICHA =
  "Declaro, para os devidos fins de direito, que todas as informações prestadas nesta ficha são verdadeiras e que não omiti nenhum dado referente à saúde do(a) aluno(a). Comprometo-me a informar imediatamente ao profissional responsável caso ocorra qualquer alteração no estado de saúde do(a) aluno(a).";

export const DOCS: Record<
  TipoDoc,
  { titulo: string; subtitulo: string; campos: CampoDoc[]; arquivo: string; clausulas?: { titulo: string; texto: string }[] }
> = {
  ficha: {
    titulo: "Ficha de Anamnese e PAR-Q (Anexo)",
    subtitulo: "Avaliação de prontidão para atividade física infantil — Prof. Victor Hugo (CREF 057790-G/MG).",
    campos: CAMPOS_FICHA,
    arquivo: "ficha-anamnese-parq",
    clausulas: [{ titulo: "DECLARAÇÃO E TERMO DE RESPONSABILIDADE", texto: DECLARACAO_FICHA }],
  },
  contrato: {
    titulo: "Contrato Misto de Prestação de Serviços",
    subtitulo: "Super CT — recreação, desenvolvimento infantil e treinamento funcional.",
    campos: CAMPOS_CONTRATO,
    arquivo: "contrato",
    clausulas: CLAUSULAS_CONTRATO,
  },
};
