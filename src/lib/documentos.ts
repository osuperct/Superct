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
};

export const CAMPOS_FICHA: CampoDoc[] = [
  { chave: "aluno_nome", rotulo: "Nome completo do aluno" },
  { chave: "aluno_nascimento", rotulo: "Data de nascimento" },
  { chave: "aluno_idade", rotulo: "Idade" },
  { chave: "escola", rotulo: "Escola / série" },
  { chave: "responsavel_nome", rotulo: "Nome do responsável" },
  { chave: "responsavel_cpf", rotulo: "CPF do responsável" },
  { chave: "responsavel_rg", rotulo: "RG do responsável" },
  { chave: "endereco", rotulo: "Endereço completo" },
  { chave: "telefone", rotulo: "Telefone / WhatsApp" },
  { chave: "contato_emergencia", rotulo: "Contato de emergência (nome e telefone)" },
  { chave: "saude", rotulo: "Problemas de saúde, alergias ou medicamentos", longo: true },
  { chave: "plano", rotulo: "Convênio / plano de saúde" },
  { chave: "turma", rotulo: "Turma e horário desejados" },
];

export const CAMPOS_CONTRATO: CampoDoc[] = [
  { chave: "contratante", rotulo: "Nome do contratante (responsável)" },
  { chave: "cpf", rotulo: "CPF do contratante" },
  { chave: "endereco", rotulo: "Endereço do contratante" },
  { chave: "aluno", rotulo: "Nome do aluno" },
  { chave: "servico", rotulo: "Serviço contratado (modalidade / evento)", fixo: "Treinamento funcional e recreação" },
  { chave: "data_inicio", rotulo: "Data de início" },
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

/** Cláusulas do contrato principal do Super CT (regras do CT, pagamento, imagem, etc.). */
export const CLAUSULAS_CONTRATO: { titulo: string; texto: string }[] = [
  {
    titulo: "1 — DAS PARTES E DO OBJETO",
    texto:
      "CONTRATADA: SUPER CT — Desenvolvimento e Recreação Infantil, com sede na Rua Geraldo Marcolini, 1609, São Sebastião do Paraíso/MG, representada pelo Professor Victor Hugo Jorge de Siqueira, CREF 057790/MG. CONTRATANTE: o responsável legal identificado neste contrato. O objeto é a prestação de serviços de treinamento funcional infantil e recreação ao aluno indicado, nos dias e horários escolhidos pelo CONTRATANTE.",
  },
  {
    titulo: "2 — DO PAGAMENTO",
    texto:
      "O CONTRATANTE pagará o plano escolhido neste contrato, no dia de vencimento e na forma de pagamento selecionados. O atraso superior a 10 dias implica multa de 2% e juros de 1% ao mês sobre o valor devido, podendo a CONTRATADA suspender o atendimento até a regularização. Os planos anual, semestral e recorrente têm o valor mensal garantido durante a vigência contratada; a desistência antes do prazo não gera devolução das parcelas já pagas.",
  },
  {
    titulo: "3 — DAS AULAS, FALTAS E REPOSIÇÕES",
    texto:
      "As mensalidades correspondem à reserva de vaga na turma e no horário escolhidos, não havendo desconto por falta do aluno. Feriados e recessos divulgados no calendário do Super CT não são repostos nem descontados. Trocas de horário dependem de vaga na turma pretendida e devem ser combinadas com antecedência.",
  },
  {
    titulo: "4 — DAS REGRAS DO CT",
    texto:
      "O aluno deve comparecer com roupa adequada para atividade física e tênis, garrafinha de água e cabelo preso. O uso dos equipamentos (parede de escalada, argolas, trepa-trepa, barras, caixas e cordas) só é permitido com autorização e supervisão do professor. Não é permitido entrar na área de treino sem o professor, levar alimentos para o tatame, nem usar celular durante a aula. Atitudes de desrespeito, agressão ou risco à segurança dos colegas serão comunicadas ao responsável e, se persistirem, podem gerar o desligamento do aluno. O responsável deve deixar e buscar o aluno no horário; a CONTRATADA não se responsabiliza pelo aluno fora do horário da sua turma.",
  },
  {
    titulo: "5 — DA SAÚDE E DA SEGURANÇA",
    texto:
      "O CONTRATANTE declara que informou na ficha do aluno todas as condições de saúde, alergias, restrições e medicamentos em uso, e se compromete a comunicar qualquer alteração. As atividades são orientadas por profissional habilitado, mas envolvem risco natural de pequenas quedas e escoriações próprias da prática esportiva infantil. Em caso de emergência, a CONTRATADA prestará os primeiros atendimentos e acionará imediatamente o responsável e o serviço de saúde.",
  },
  {
    titulo: "6 — DO USO DE IMAGEM",
    texto: TERMO_IMAGEM,
  },
  {
    titulo: "7 — DA VIGÊNCIA E DO CANCELAMENTO",
    texto:
      "O contrato vigora a partir da data de início indicada, por prazo indeterminado (ou pelo período do plano escolhido), podendo ser encerrado por qualquer das partes com aviso de 30 dias, mantida a obrigação de pagamento do período utilizado. O cancelamento de planos com desconto (anual, semestral e recorrente) antes do prazo contratado implica a cobrança da diferença em relação ao plano mensal nos meses já frequentados.",
  },
  {
    titulo: "8 — DA PROTEÇÃO DE DADOS E DO FORO",
    texto:
      "Os dados do aluno e do responsável são usados apenas para a execução deste contrato e para contato, conforme a LGPD. As partes elegem o foro de São Sebastião do Paraíso/MG para dirimir eventuais dúvidas. Ao assinar eletronicamente, o CONTRATANTE declara ter lido e concordado integralmente com estas cláusulas.",
  },
];

export const DOCS: Record<
  TipoDoc,
  { titulo: string; subtitulo: string; campos: CampoDoc[]; arquivo: string; clausulas?: { titulo: string; texto: string }[] }
> = {
  ficha: {
    titulo: "Ficha do Aluno",
    subtitulo: "Anexo com os dados do aluno, saúde e contatos.",
    campos: CAMPOS_FICHA,
    arquivo: "ficha-do-aluno",
  },
  contrato: {
    titulo: "Contrato de Prestação de Serviços",
    subtitulo: "Contrato de prestação de serviço entre o responsável e o Super CT.",
    campos: CAMPOS_CONTRATO,
    arquivo: "contrato",
    clausulas: CLAUSULAS_CONTRATO,
  },
};
