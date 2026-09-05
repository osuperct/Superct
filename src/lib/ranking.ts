import { supabase } from "@/integrations/supabase/client";

export type LinhaRanking = {
  user_id?: string;
  apelido: string;
  pontos: number;
  fase: number;
};

/** Ranking público: melhores pontuações, em ordem. */
export async function listarRanking(limite = 20): Promise<LinhaRanking[]> {
  const { data, error } = await supabase
    .from("ranking_publico")
    .select("apelido, pontos, fase")
    .order("pontos", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(limite);
  if (error) throw error;
  return (data ?? []) as LinhaRanking[];
}

/** Registro do jogador logado (apelido + melhor pontuação). */
export async function meuRegistro(userId: string): Promise<LinhaRanking | null> {
  const { data, error } = await supabase
    .from("ranking_jogo")
    .select("user_id, apelido, pontos, fase")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as LinhaRanking | null) ?? null;
}

export async function salvarApelido(userId: string, apelido: string) {
  const limpo = apelido.trim().slice(0, 20);
  if (!limpo) throw new Error("Informe um apelido");
  const { error } = await supabase
    .from("ranking_jogo")
    .upsert({ user_id: userId, apelido: limpo }, { onConflict: "user_id" });
  if (error) throw error;
  return limpo;
}

/** Grava a pontuação apenas quando for melhor que a anterior. */
export async function salvarPontuacao(
  userId: string,
  apelido: string,
  pontos: number,
  fase: number,
) {
  const atual = await meuRegistro(userId);
  if (atual && atual.pontos >= pontos) return atual;
  const { data, error } = await supabase
    .from("ranking_jogo")
    .upsert(
      { user_id: userId, apelido: apelido.trim().slice(0, 20) || "Jogador", pontos, fase },
      { onConflict: "user_id" },
    )
    .select("user_id, apelido, pontos, fase")
    .single();
  if (error) throw error;
  return data as LinhaRanking;
}
