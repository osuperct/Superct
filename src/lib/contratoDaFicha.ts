import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BUCKET, CLAUSULAS_CONTRATO, DOCS, TERMO_IMAGEM } from "@/lib/documentos";
import { gerarDocumentoPdf } from "@/lib/documentoPdf";

/**
 * Contratos registrados só como dados (sem PDF anexado) não recebem aditivos.
 * Gera o PDF a partir dos dados já preenchidos e arquiva como contrato do próprio responsável.
 */
export async function garantirPdfContrato(client: SupabaseClient<Database>, uid: string) {
  const { data: docs } = await client.from("documentos").select("id").eq("user_id", uid).eq("tipo", "contrato").limit(1);
  if (docs?.length) return false;
  const { data: fichas } = await client.from("fichas").select("id, aluno_id, dados, created_at").eq("user_id", uid).eq("tipo", "contrato");
  if (!fichas?.length) return false;
  const doc = DOCS.contrato;
  for (const f of fichas) {
    const v = (f.dados ?? {}) as Record<string, string>;
    const linhas = doc.campos.map((c) => ({
      rotulo: c.rotulo,
      valor: c.fixo !== undefined ? c.fixo : c.multiplos ? c.multiplos.map((m) => v[m.chave]).filter(Boolean).join(" — ") : String(v[c.chave] ?? ""),
    }));
    const blob = await gerarDocumentoPdf({ titulo: doc.titulo, linhas, termo: TERMO_IMAGEM, assinaturaDataUrl: null, nomeAssinante: String(v["contratante"] ?? ""), assinaturaEmpresa: true, clausulas: CLAUSULAS_CONTRATO });
    const nome = `contrato-${String(f.created_at).slice(0, 10)}.pdf`;
    const caminho = `${uid}/${Date.now()}-${nome}`;
    const { error: eu } = await client.storage.from(BUCKET).upload(caminho, blob, { contentType: "application/pdf" });
    if (eu) throw eu;
    const { error } = await client.from("documentos").insert({ user_id: uid, tipo: "contrato", ...(f.aluno_id ? { aluno_id: f.aluno_id } : {}), nome_arquivo: nome, caminho });
    if (error) throw error;
  }
  return true;
}
