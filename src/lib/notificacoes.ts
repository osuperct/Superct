import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID,
  appId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID,
  messagingSenderId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID?.split(":")[1] ?? "",
};

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" | "already-granted"; token?: string };

export async function enablePush(): Promise<PushResult> {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId ||
    !firebaseConfig.messagingSenderId
  ) {
    return { status: "not-configured" };
  }

  if (!("Notification" in window) || !(await isSupported())) {
    return { status: "unsupported" };
  }

  if (window.top !== window.self) {
    return { status: "open-in-new-tab" };
  }

  let permission = Notification.permission;
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return { status: "denied" };
  }

  const query = new URLSearchParams(firebaseConfig).toString();
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const messaging = getMessaging(app);
  const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

  if (!token) {
    return { status: "denied" };
  }

  const { data: session } = await supabase.auth.getUser();
  if (session.user) {
    await salvarToken(session.user.id, token);
  }

  return { status: permission === "granted" ? "registered" : "already-granted", token };
}

export async function salvarToken(userId: string, token: string) {
  if (!userId || !token) return;
  const plataforma = /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "android/web";
  const { error } = await supabase.from("tokens_push").upsert(
    { user_id: userId, token, plataforma },
    { onConflict: "user_id" }
  );
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Erro ao salvar token push:", error);
  }
}

export function formatarLinkWhatsApp(telefone: string, titulo: string, mensagem: string) {
  const numero = telefone.replace(/\D/g, "");
  const texto = encodeURIComponent(`*${titulo}*\n\n${mensagem}`);
  return `https://wa.me/55${numero}?text=${texto}`;
}
