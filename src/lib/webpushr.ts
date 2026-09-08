import { supabase } from "@/integrations/supabase/client";

/**
 * Chave pública do WebPushr (pode ficar no código, é publicável).
 * Pegue em WebPushr → Settings → Integration → "Public Key".
 */
export const WEBPUSHR_KEY =
  "BBEWdJgDzYLNtfZK3412qtwR2BV3jHF31vT6CH65q5R7Jukp9AXn4oqluADegxFn-AoQcCV7wMHWlcAaYzoOZ74";

type Webpushr = ((acao: string, opcoes?: unknown, cb?: (v: unknown) => void) => void) & {
  q?: unknown[];
};

declare global {
  interface Window {
    webpushr?: Webpushr;
  }
}

let carregando: Promise<void> | null = null;

/** Carrega o SDK do WebPushr uma única vez. */
function carregarSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("sem navegador"));
  if (!WEBPUSHR_KEY) return Promise.reject(new Error("WebPushr sem chave configurada"));
  if (window.webpushr) return Promise.resolve();
  if (carregando) return carregando;

  carregando = new Promise<void>((resolve, reject) => {
    const fila: unknown[] = [];
    const stub = ((...args: unknown[]) => {
      fila.push(args);
    }) as Webpushr;
    stub.q = fila;
    window.webpushr = stub;

    const s = document.createElement("script");
    s.src = "https://cdn.webpushr.com/app.min.js";
    s.async = true;
    s.onload = () => {
      window.webpushr?.("setup", { key: WEBPUSHR_KEY, integration: "popup" });
      resolve();
    };
    s.onerror = () => reject(new Error("Não foi possível carregar o WebPushr"));
    document.head.appendChild(s);
  });
  return carregando;
}

/** Devolve o identificador do aparelho (sid) quando a pessoa já autorizou. */
export function lerSid(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!window.webpushr) return resolve(null);
    let respondeu = false;
    const receber = (valor: unknown) => {
      if (respondeu) return;
      respondeu = true;
      const sid = typeof valor === "string" ? valor : (valor as { sid?: string } | null)?.sid;
      resolve(sid && String(sid).length > 0 ? String(sid) : null);
    };
    // O WebPushr espera a função de resposta como 2º argumento.
    window.webpushr("fetch_id", receber);
    setTimeout(() => {
      if (!respondeu) resolve(null);
    }, 6000);

  });
}

export function suportaPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    window.isSecureContext
  );
}

export function permissaoAtual(): NotificationPermission | "indisponivel" {
  if (!suportaPush()) return "indisponivel";
  return Notification.permission;
}

/** Guarda o aparelho na conta do responsável. */
export async function salvarAparelho(userId: string, sid: string) {
  await supabase.from("push_aparelhos").upsert(
    { user_id: userId, sid, updated_at: new Date().toISOString() },
    { onConflict: "sid" },
  );
}

/** Diz se esta conta já tem algum aparelho ativo. */
export async function temAparelho(userId: string) {
  const { count } = await supabase
    .from("push_aparelhos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

/**
 * Pede a permissão, pega o identificador e salva na conta.
 * Devolve o motivo quando não der certo.
 */
export async function ativarNotificacoes(userId: string): Promise<{ ok: boolean; erro?: string }> {
  if (!suportaPush()) return { ok: false, erro: "Este aparelho ou navegador não aceita notificações." };
  if (!WEBPUSHR_KEY) return { ok: false, erro: "As notificações ainda não estão configuradas." };

  try {
    await carregarSdk();
  } catch {
    return { ok: false, erro: "Não foi possível carregar as notificações agora." };
  }

  if (Notification.permission === "denied") {
    return { ok: false, erro: "As notificações estão bloqueadas nas configurações do navegador." };
  }

  if (Notification.permission !== "granted") {
    window.webpushr?.("prompt");
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") return { ok: false, erro: "Permissão não concedida." };
  }

  for (let i = 0; i < 6; i++) {
    const sid = await lerSid();
    if (sid) {
      await salvarAparelho(userId, sid);
      return { ok: true };
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { ok: false, erro: "O aparelho não terminou o registro. Tente de novo em instantes." };
}
