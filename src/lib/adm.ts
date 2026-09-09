import { supabase } from "@/integrations/supabase/client";

export type ContaAcesso = {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  professor: boolean;
  adm: boolean;
  aprovado: boolean;
  criadoEm: string;
  documentosFisicos: boolean;
};

type Resultado = { ok: true } | { ok: false; erro: string };

/** Lista as contas cadastradas com os acessos de cada uma (somente ADM, validado no banco). */
export async function listarAcessosContas(): Promise<ContaAcesso[]> {
  const { data, error } = await supabase.rpc("adm_listar_acessos");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    email: c.email ?? "",
    nome: c.nome ?? "",
    telefone: c.telefone ?? "",
    professor: Boolean(c.professor),
    adm: Boolean(c.adm),
    aprovado: Boolean(c.aprovado),
    criadoEm: c.criado_em ?? "",
    documentosFisicos: Boolean(c.documentos_fisicos),
  }));
}

/** Aprova (libera o acesso) ou bloqueia o cadastro de um responsável. */
export async function definirAprovacaoConta(
  userId: string,
  aprovado: boolean,
  senha = "",
  documentosFisicos?: boolean,
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("adm_definir_aprovacao", {
    _user_id: userId,
    _aprovado: aprovado,
    _senha: senha,
    ...(documentosFisicos === undefined ? {} : { _fisico: documentosFisicos }),
  });
  if (error) return { ok: false, erro: `Não foi possível alterar a aprovação: ${error.message}` };
  return data as unknown as Resultado;
}

/** Libera ou remove o acesso de professor / ADM de uma conta. */
export async function definirAcessoConta(
  userId: string,
  papel: "professor" | "adm",
  liberar: boolean,
  senha: string,
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("adm_definir_acesso", {
    _user_id: userId,
    _papel: papel,
    _liberar: liberar,
    _senha: senha,
  });
  if (error) return { ok: false, erro: `Não foi possível alterar o acesso: ${error.message}` };
  return data as unknown as Resultado;
}

/** Exclui definitivamente uma conta cadastrada (pede a senha de confirmação). */
export async function excluirConta(userId: string, senha: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("adm_excluir_conta", { _user_id: userId, _senha: senha });
  if (error) return { ok: false, erro: `Não foi possível excluir o cadastro: ${error.message}` };
  return data as unknown as Resultado;
}

export type ContratoAdm = {
  id: string;
  userId: string;
  alunoId: string | null;
  dados: Record<string, string>;
  criadoEm: string;
  responsavel: string;
  aluno: string;
};

/** Lista os contratos preenchidos pelos responsáveis (somente ADM, validado no banco). */
export async function listarContratos(): Promise<ContratoAdm[]> {
  const { data, error } = await supabase.rpc("adm_listar_contratos");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    alunoId: c.aluno_id,
    dados: (c.dados ?? {}) as Record<string, string>,
    criadoEm: c.created_at ?? "",
    responsavel: c.responsavel ?? "",
    aluno: c.aluno ?? "",
  }));
}

/** Corrige os dados de um contrato preenchido de forma errada. */
export async function editarContrato(
  fichaId: string,
  dados: Record<string, string>,
): Promise<Resultado> {
  const { data, error } = await supabase.rpc("adm_editar_contrato", {
    _ficha_id: fichaId,
    _dados: dados,
  });
  if (error) return { ok: false, erro: `Não foi possível salvar o contrato: ${error.message}` };
  return data as unknown as Resultado;
}

/** Cadastra um novo aluno para um responsável já existente (somente professor). */
export async function criarAlunoProfessor(entrada: {
  userId: string;
  nome: string;
  nascimento?: string;
  idade?: number;
  documentosFisicos?: boolean;
}): Promise<{ ok: true; aluno_id: string } | { ok: false; erro: string }> {
  const { data, error } = await supabase.rpc("prof_criar_aluno", {
    _user_id: entrada.userId,
    _nome: entrada.nome,
    _nascimento: entrada.nascimento || null,
    _idade: entrada.idade ?? null,
    _fisico: entrada.documentosFisicos ?? false,
  });
  if (error) return { ok: false, erro: `Não foi possível cadastrar o aluno: ${error.message}` };
  return data as unknown as { ok: true; aluno_id: string } | { ok: false; erro: string };
}
