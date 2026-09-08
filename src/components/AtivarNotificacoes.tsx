import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { WEBPUSHR_KEY, ativarNotificacoes, suportaPush, temAparelho } from "@/lib/webpushr";

/** Aviso flutuante que pede ao responsável para ativar as notificações no celular. */
export function AtivarNotificacoes() {
  const [uid, setUid] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid || !WEBPUSHR_KEY || !suportaPush()) return;
    if (Notification.permission === "denied") return;
    if (sessionStorage.getItem("aviso-push-fechado") === "1") return;
    void temAparelho(uid).then((tem) => setMostrar(!tem));
  }, [uid]);

  if (!mostrar || !uid) return null;

  async function ativar() {
    setOcupado(true);
    const r = await ativarNotificacoes(uid!);
    setOcupado(false);
    if (r.ok) {
      toast.success("Notificações ativadas neste aparelho!");
      setMostrar(false);
    } else {
      toast.error(r.erro ?? "Não foi possível ativar agora.");
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-4 z-[65] mx-auto max-w-md rounded-xl border-2 border-primary bg-card/95 p-4 shadow-lg backdrop-blur">
      <h3 className="flex items-center gap-2 font-display text-base tracking-tight">
        <Bell className="size-4 text-primary" /> ATIVE AS NOTIFICAÇÕES!
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Receba os recados do Professor Tio Victor direto no seu celular.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => void ativar()}
          disabled={ocupado}
          className="flex-1 rounded-md bg-primary px-3 py-2 font-display text-sm text-primary-foreground disabled:opacity-60"
        >
          {ocupado ? "ATIVANDO…" : "ATIVAR AGORA"}
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem("aviso-push-fechado", "1");
            setMostrar(false);
          }}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          Depois
        </button>
      </div>
    </div>
  );
}
