import { supabase } from "@/integrations/supabase/client";

/** Chave pública das notificações (publicável). */
export const VAPID_PUBLIC_KEY =
  "BC2ckYZvCBkwhJAetDTIvzDSb2DXPF3TiHI9-ajd_XDAptavlBkMcydBbZBgQx4hhlXRu_HCdcRKIpzgwD8fX9M";

function base64UrlParaBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

function bytesParaBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function suportaPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    window.isSecureContext
  );
}

async function registrarWorker() {
  return navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
}

async function guardar(userId: string, sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const p256dh = json.keys?.p256dh ?? bytesParaBase64Url(sub.getKey("p256dh"));
  const auth = json.keys?.auth ?? bytesParaBase64Url(sub.getKey("auth"));
  if (!json.endpoint || !p256dh || !auth) return "Este aparelho não devolveu os dados de notificação.";
  const { error } = await supabase.from("push_inscricoes").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh,
      auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  return error ? error.message : null;
}

/** Diz se esta conta já tem algum aparelho registrado. */
export async function temAparelho(userId: string) {
  const { count } = await supabase
    .from("push_inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

/** Quando já autorizou neste aparelho, atualiza o registro em silêncio. */
export async function sincronizarAparelho(userId: string) {
  if (!suportaPush() || Notification.permission !== "granted") return false;
  try {
    const reg = await registrarWorker();
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlParaBytes(VAPID_PUBLIC_KEY),
      });
    }
    return (await guardar(userId, sub)) === null;
  } catch {
    return false;
  }
}

/** Pede a permissão, cria a inscrição e salva na conta. */
export async function ativarNotificacoes(userId: string): Promise<{ ok: boolean; erro?: string }> {
  if (!suportaPush()) return { ok: false, erro: "Este aparelho ou navegador não aceita notificações." };
  if (Notification.permission === "denied") {
    return { ok: false, erro: "As notificações estão bloqueadas nas configurações do navegador." };
  }
  if (Notification.permission !== "granted") {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return { ok: false, erro: "Permissão não concedida." };
  }
  try {
    const reg = await registrarWorker();
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlParaBytes(VAPID_PUBLIC_KEY),
      }));
    const erro = await guardar(userId, sub);
    if (erro) return { ok: false, erro: "Não foi possível guardar o aparelho na sua conta." };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível ativar agora." };
  }
}
