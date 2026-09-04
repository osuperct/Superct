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
  { chave: "vencimento", rotulo: "Dia de vencimento" },
  { chave: "forma_pagamento", rotulo: "Forma de pagamento" },
  { chave: "observacoes", rotulo: "Observações", longo: true },
];

export type TipoDoc = "ficha" | "contrato";

export const DOCS: Record<TipoDoc, { titulo: string; subtitulo: string; campos: CampoDoc[]; arquivo: string }> = {
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
  },
};
