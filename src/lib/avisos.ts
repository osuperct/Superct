import { supabase } from "@/integrations/supabase/client";

export type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  autor_id: string;
  created_at: string;
  imagem_url: string | null;
  imagem?: string | null;
};

export const BUCKET_AVISOS = "avisos";

export async function listarAvisos(limite = 30) {
  const { data } = await supabase
    .from("avisos")
    .select("id, titulo, mensagem, autor_id, created_at, imagem_url")
    .order("created_at", { ascending: false })
    .limit(limite);
  return await comImagens((data ?? []) as Aviso[]);
}

/** Gera o endereço temporário das fotos anexadas. */
export async function comImagens(avisos: Aviso[]) {
  return Promise.all(
    avisos.map(async (a) => {
      if (!a.imagem_url) return { ...a, imagem: null };
      const { data } = await supabase.storage.from(BUCKET_AVISOS).createSignedUrl(a.imagem_url, 60 * 60 * 12);
      return { ...a, imagem: data?.signedUrl ?? null };
    }),
  );
}

/** Envia a foto do aviso e devolve o caminho salvo. */
export async function enviarImagemAviso(file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const caminho = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_AVISOS).upload(caminho, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return caminho;
}

export async function listarLidos(userId: string) {
  const { data } = await supabase.from("avisos_lidos").select("aviso_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => (r as { aviso_id: string }).aviso_id));
}

export async function marcarLido(userId: string, avisoId: string) {
  await supabase.from("avisos_lidos").insert({ user_id: userId, aviso_id: avisoId });
}

export async function enviarAviso(autorId: string, titulo: string, mensagem: string, imagem?: File | null) {
  const caminho = imagem ? await enviarImagemAviso(imagem) : null;
  const { error } = await supabase.from("avisos").insert({
    autor_id: autorId,
    titulo: titulo.trim(),
    mensagem: mensagem.trim(),
    imagem_url: caminho,
  });
  if (error) throw error;
}

export async function excluirAviso(id: string) {
  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) throw error;
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Situação das notificações do aparelho. */
export type EstadoNotificacao = "indisponivel" | "abrir-em-nova-aba" | "permitido" | "negado" | "pendente";

export function estadoNotificacao(): EstadoNotificacao {
  if (typeof window === "undefined" || !("Notification" in window)) return "indisponivel";
  if (window.top !== window.self) return "abrir-em-nova-aba";
  if (Notification.permission === "granted") return "permitido";
  if (Notification.permission === "denied") return "negado";
  return "pendente";
}

export async function pedirPermissao(): Promise<EstadoNotificacao> {
  const estado = estadoNotificacao();
  if (estado !== "pendente") return estado;
  const resposta = await Notification.requestPermission();
  return resposta === "granted" ? "permitido" : "negado";
}

export function notificarAparelho(titulo: string, corpo: string) {
  if (estadoNotificacao() !== "permitido") return;
  try {
    new Notification(titulo, { body: corpo, icon: "/favicon.png" });
  } catch {
    /* sem notificação disponível */
  }
}
