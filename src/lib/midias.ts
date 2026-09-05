import { supabase } from "@/integrations/supabase/client";

export const BUCKET_MIDIAS = "app-midias";

/** Vitrine de vídeos da página inicial. */
export const GRUPO_VIDEOS = "VIDEOS";

/** Logo principal da página inicial. */
export const GRUPO_LOGO = "LOGO";

/** Cartões da página inicial que podem ter foto de capa e fotos internas. */
export const GRUPOS_CARDS = [
  "FUNCIONAL INFANTIL",
  "GINÁSTICA",
  "ESPORTES",
  "PAREDE DE ESCALADA",
  "SUPER CAMPÃO — AULAS ESPECIAIS",
  "TREPA-TREPA & ARGOLAS",
  "COLÔNIA DE FÉRIAS E ACAMPAMENTO INDOOR",
] as const;

export type TipoMidia = "capa" | "foto" | "video" | "logo";

export type Midia = {
  id: string;
  tipo: TipoMidia;
  grupo: string;
  caminho: string;
  descricao: string | null;
  ordem: number;
  com_som: boolean;
  inicio: number;
  fim: number | null;
  ativo: boolean;
  url?: string | null;
};

async function comUrls(lista: Midia[]) {
  return Promise.all(
    lista.map(async (m) => {
      const { data } = await supabase.storage.from(BUCKET_MIDIAS).createSignedUrl(m.caminho, 60 * 60 * 12);
      return { ...m, url: data?.signedUrl ?? null };
    }),
  );
}

const COLUNAS = "id, tipo, grupo, caminho, descricao, ordem, com_som, inicio, fim, ativo";

/** Mídias visíveis na página inicial. */
export async function listarMidias() {
  const { data } = await supabase
    .from("midias_app")
    .select(COLUNAS)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  return comUrls((data ?? []) as Midia[]);
}

/** Mídias para a Área ADM (inclui as ocultas). */
export async function listarMidiasAdm() {
  const { data } = await supabase
    .from("midias_app")
    .select(COLUNAS)
    .order("grupo", { ascending: true })
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  return comUrls((data ?? []) as Midia[]);
}

export type NovaMidia = {
  tipo: TipoMidia;
  grupo: string;
  arquivo: Blob;
  nomeArquivo: string;
  descricao?: string;
  com_som?: boolean;
  inicio?: number;
  fim?: number | null;
  ordem?: number;
};

export async function enviarMidia(nova: NovaMidia) {
  const ext = (nova.nomeArquivo.split(".").pop() ?? "jpg").toLowerCase();
  const caminho = `${nova.tipo}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET_MIDIAS).upload(caminho, nova.arquivo, {
    contentType: nova.arquivo.type || "application/octet-stream",
    upsert: false,
  });
  if (up.error) throw up.error;

  // Cada cartão tem apenas uma capa: a antiga sai de cena.
  if (nova.tipo === "capa" || nova.tipo === "logo") {
    const antigas = await supabase.from("midias_app").select("id, caminho").eq("tipo", nova.tipo).eq("grupo", nova.grupo);
    for (const a of (antigas.data ?? []) as { id: string; caminho: string }[]) {
      await excluirMidia(a.id, a.caminho);
    }
  }

  const { error } = await supabase.from("midias_app").insert({
    tipo: nova.tipo,
    grupo: nova.grupo,
    caminho,
    descricao: nova.descricao?.trim() || null,
    com_som: nova.com_som ?? false,
    inicio: nova.inicio ?? 0,
    fim: nova.fim ?? null,
    ordem: nova.ordem ?? 0,
  });
  if (error) throw error;
}

export async function atualizarMidia(id: string, dados: Partial<Pick<Midia, "descricao" | "com_som" | "inicio" | "fim" | "ordem" | "ativo">>) {
  const { error } = await supabase.from("midias_app").update(dados).eq("id", id);
  if (error) throw error;
}

export async function excluirMidia(id: string, caminho: string) {
  const { error } = await supabase.from("midias_app").delete().eq("id", id);
  if (error) throw error;
  await supabase.storage.from(BUCKET_MIDIAS).remove([caminho]);
}
