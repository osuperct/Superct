import { supabase } from "@/integrations/supabase/client";

export type Aviso = {
  id: string;
  titulo: string;
  mensagem: string;
  autor_id: string;
  created_at: string;
};

export async function listarAvisos(limite = 30) {
  const { data } = await supabase
    .from("avisos")
    .select("id, titulo, mensagem, autor_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limite);
  return (data ?? []) as Aviso[];
}

export async function listarLidos(userId: string) {
  const { data } = await supabase.from("avisos_lidos").select("aviso_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => (r as { aviso_id: string }).aviso_id));
}

export async function marcarLido(userId: string, avisoId: string) {
  await supabase.from("avisos_lidos").insert({ user_id: userId, aviso_id: avisoId });
}

export async function enviarAviso(autorId: string, titulo: string, mensagem: string) {
  const { error } = await supabase.from("avisos").insert({
    autor_id: autorId,
    titulo: titulo.trim(),
    mensagem: mensagem.trim(),
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
