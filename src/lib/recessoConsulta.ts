import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { RECESSO, contratosPendentes } from "@/lib/recesso";

/** Read as the authenticated account; never use administrative credentials. */
export async function consultarAvisoRecesso(client: SupabaseClient<Database>) {
  const { data: usuario, error: authError } = await client.auth.getUser();
  if (authError || !usuario.user) throw new Error("Sua sessão expirou. Entre novamente para consultar o aviso.");
  const uid = usuario.user.id;
  const [perfil, documentos, aceites] = await Promise.all([
    client.from("perfis").select("aprovado, bloqueado_em").eq("id", uid).maybeSingle(),
    client.from("documentos").select("id, aluno_id, nome_arquivo, created_at").eq("user_id", uid).eq("tipo", "contrato"),
    client.from("recesso_aceites").select("documento_original_id").eq("user_id", uid).eq("versao", RECESSO.versao),
  ]);
  for (const resultado of [perfil, documentos, aceites]) {
    if (resultado.error) {
      console.error("Consulta do recesso", resultado.error.code, resultado.error.message);
      throw new Error("Não foi possível consultar o aviso de recesso. Tente novamente.");
    }
  }
  const pendentes = contratosPendentes(documentos.data ?? [], (aceites.data ?? []).map((a) => a.documento_original_id));
  return {
    mostrar: Boolean(perfil.data?.aprovado && !perfil.data.bloqueado_em && (pendentes.length > 0 || !aceites.data?.length)),
    contratos: pendentes.length,
  };
}