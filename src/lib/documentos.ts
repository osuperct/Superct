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
    opcoes: ["Condicionamento físico", "Desenvolvimento motor", "Recreação", "Socialização"],
  },
  { chave: "plano", rotulo: "Convênio / plano de saúde" },
  { chave: "turma", rotulo: "Turma e horário desejados", opcoes: ["Turma Manhã", "Turma Tarde", "Turma Noite"] },
];

export const CAMPOS_CONTRATO: CampoDoc[] = [
  { chave: "contratada", rotulo: "Contratada", fixo: "Super CT — Desenvolvimento e Recreação Infantil | CNPJ 61.251.274/0001-48" },
  {
    chave: "profissional",
    rotulo: "Profissional responsável",
    fixo: "Victor Hugo Jorge de Siqueira | CREF 057790-G/MG | CPF 097.854.576-13",
  },
  { chave: "contratante", rotulo: "Nome do responsável legal (contratante)" },
  { chave: "cpf", rotulo: "CPF do contratante", obrigatorio: true, cpf: true },
  { chave: "rg", rotulo: "RG do contratante" },
  { chave: "telefone", rotulo: "Telefone / WhatsApp", obrigatorio: true },
  { chave: "endereco", rotulo: "Endereço completo" },
  { chave: "aluno", rotulo: "Nome do aluno(a)" },
  { chave: "aluno_nascimento", rotulo: "Data de nascimento do aluno" },
  { chave: "servico", rotulo: "Serviço contratado (modalidade / evento)", fixo: "Treinamento funcional e recreação" },
  { chave: "data_inicio", rotulo: "Data de início" },
  { chave: "matricula", rotulo: "Taxa de matrícula / cadastro (R$)" },
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
    rotulo: "Valor mensal / do evento (R$)",
    opcoes: [
      "Plano mensal R$185,00",
      "Plano Recorrente R$160,00",
      "Plano 1x na semana R$135,00",
      "Plano 2x na semana R$150,00",
      "Plano anual 12x de R$140,00",
      "Plano semestral 6x de R$150,00",
    ],
  },
  { chave: "vencimento", rotulo: "Dia de vencimento", opcoes: ["5", "10", "20", "25"] },
  { chave: "forma_pagamento", rotulo: "Forma de pagamento", opcoes: ["Pix / dinheiro", "Cartão", "Cartão Recorrente (link)"] },
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
      "4.1. A taxa de matrícula/cadastro indicada neste contrato deverá ser paga no ato da assinatura deste instrumento. 4.2. Pela prestação dos serviços integrados, o CONTRATANTE pagará a mensalidade unificada do plano escolhido, com vencimento no dia indicado de cada mês. 4.3. O pagamento poderá ser efetuado via PIX (chave celular 35988223596) ou via cartão de crédito, conforme acordado entre as partes. 4.4. Os valores poderão ser reajustados anualmente conforme atualização da tabela vigente do CT, mediante comunicação prévia aos responsáveis.",
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
      "O cancelamento deverá ser solicitado formalmente por escrito pelo RESPONSÁVEL LEGAL com antecedência mínima de 30 (trinta) dias. A ausência do aluno não isenta o pagamento das mensalidades sem o cancelamento formal.",
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
