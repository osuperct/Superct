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
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      // Só troca a conta em mudanças reais de sessão: eventos de renovação
      // vinham sem sessão e faziam o aviso desaparecer sozinho.
      if (evento === "SIGNED_OUT") return setUid(null);
      if (s?.user.id) setUid(s.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid || !WEBPUSHR_KEY || !suportaPush()) return;
    void temAparelho(uid).then((tem) => {
      setMostrar(!tem);
    });
  }, [uid]);


  if (!mostrar || !uid) return null;

  async function ativar() {
    if (!uid) return;
    setErro(null);
    setOcupado(true);
    const r = await ativarNotificacoes(uid);
    setOcupado(false);
    if (r.ok) {
      toast.success("Notificações ativadas neste aparelho!");
      setMostrar(false);
    } else {
      const mensagem = r.erro ?? "Não foi possível ativar agora.";
      setErro(mensagem);
      toast.error(mensagem);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border-2 border-primary bg-card/95 p-5 shadow-[0_0_18px_hsl(var(--primary)/0.7)] backdrop-blur">
        <h3 className="flex items-center justify-center gap-2 text-center font-display text-lg tracking-tight text-primary">
          <Bell className="size-5" /> ATIVE AS NOTIFICAÇÕES!
        </h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Receba os recados do Professor Tio Victor direto no seu celular.
        </p>
        {erro ? (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-center text-xs text-destructive">
            {erro}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => void ativar()}
            disabled={ocupado}
            className="flex-1 rounded-lg bg-primary px-3 py-2.5 font-display text-sm text-primary-foreground disabled:opacity-60"
          >
            {ocupado ? "ATIVANDO…" : "ATIVAR AGORA"}
          </button>
          <button
            onClick={() => {
              setMostrar(false);
            }}
            className="rounded-lg border border-border px-4 py-2.5 text-sm"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}
