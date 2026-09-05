import { supabase } from "@/integrations/supabase/client";

export type Textos = Record<string, string>;

export const CHAVES_TEXTO = [
  { chave: "hero_titulo", rotulo: "Título abaixo da logo" },
  { chave: "hero_subtitulo", rotulo: "Texto abaixo do título" },
] as const;

export async function listarTextos(): Promise<Textos> {
  const { data } = await supabase.from("textos_app").select("chave, valor");
  const mapa: Textos = {};
  for (const t of (data ?? []) as { chave: string; valor: string }[]) mapa[t.chave] = t.valor;
  return mapa;
}

export async function salvarTexto(chave: string, valor: string) {
  const { error } = await supabase.from("textos_app").upsert({ chave, valor }, { onConflict: "chave" });
  if (error) throw error;
}
