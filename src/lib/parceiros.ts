import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ParceiroPublico = Database["public"]["Tables"]["parceiros_ct"]["Row"];
export type BeneficioParceiro = Database["public"]["Tables"]["parceiros_ct_beneficios"]["Row"];
export type ConfigParceiros = Database["public"]["Tables"]["parceiros_ct_config"]["Row"];
export type ParceiroCompleto = ParceiroPublico & Omit<BeneficioParceiro, "id">;

export function linkSeguro(url: string) {
  try { const parsed = new URL(url); return parsed.protocol === "https:" ? url : ""; } catch { return ""; }
}

export function whatsappParceiro(telefone: string) {
  const numero = telefone.replace(/\D/g, "");
  return numero ? `https://wa.me/${numero.startsWith("55") ? numero : `55${numero}`}` : "";
}

export async function resolverImagem(caminho: string) {
  if (!caminho) return "";
  if (caminho.startsWith("https://")) return linkSeguro(caminho);
  const { data, error } = await supabase.storage.from("app-midias").createSignedUrl(caminho, 3600);
  if (error) throw error;
  return data?.signedUrl ?? "";
}

export async function carregarParceiros(privado = false, adm = false) {
  let consulta = supabase.from("parceiros_ct").select("id,nome,logo_url,instagram,ordem,ativo").order("ordem").order("nome");
  if (!adm) consulta = consulta.eq("ativo", true);
  const [publicos, config] = await Promise.all([consulta, supabase.from("parceiros_ct_config").select("*").eq("id", 1).single()]);
  if (publicos.error) throw publicos.error;
  if (config.error) throw config.error;
  // Never request private columns from the public showcase.
  const beneficios = privado ? await supabase.from("parceiros_ct_beneficios").select("*") : { data: [], error: null };
  if (beneficios.error) throw beneficios.error;
  return { parceiros: publicos.data, beneficios: beneficios.data ?? [], config: config.data };
}

export const parceirosQuery = (privado = false, adm = false) => queryOptions({
  queryKey: ["parceiros", privado, adm],
  queryFn: () => carregarParceiros(privado, adm),
  staleTime: 0,
});

export function novoParceiro(): ParceiroCompleto {
  return { id: crypto.randomUUID(), nome: "", logo_url: "", instagram: "", ordem: 0, ativo: true, categoria: "", descricao: "", desconto: "", beneficio: "", cupom: "", telefone: "", condicoes: "", imagem_url: "" };
}

export async function salvarParceiro(dados: ParceiroCompleto) {
  if (!dados.nome.trim()) throw new Error("Informe o nome do parceiro.");
  if (dados.instagram && !linkSeguro(dados.instagram)) throw new Error("Informe um endereço HTTPS válido para o Instagram.");
  const { error } = await supabase.rpc("salvar_parceiro_ct", { dados });
  if (error) throw new Error("Não foi possível salvar a parceria.");
}

export async function enviarImagemParceiro(arquivo: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) throw new Error("Selecione uma imagem JPG, PNG ou WebP.");
  if (arquivo.size > 10 * 1024 * 1024) throw new Error("A imagem deve ter até 10 MB.");
  const extensao = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[arquivo.type];
  const caminho = `parceiros/${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from("app-midias").upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) throw new Error("Não foi possível enviar a imagem.");
  return caminho;
}