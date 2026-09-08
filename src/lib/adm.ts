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
  if (error) return { ok: false, erro: "Não foi possível alterar a aprovação." };
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
  if (error) return { ok: false, erro: "Não foi possível alterar o acesso." };
  return data as unknown as Resultado;
}

/** Exclui definitivamente uma conta cadastrada (pede a senha de confirmação). */
export async function excluirConta(userId: string, senha: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("adm_excluir_conta", { _user_id: userId, _senha: senha });
  if (error) return { ok: false, erro: "Não foi possível excluir o cadastro." };
  return data as unknown as Resultado;
}
