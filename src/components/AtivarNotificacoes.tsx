import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AtivarNotificacoes({ uid }: { uid: string }) {
  const [registrado, setRegistrado] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [avisoFechado, setAvisoFechado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { count } = await supabase
        .from("tokens_push")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      if (vivo) setRegistrado((count ?? 0) > 0);
    })();
    return () => {
      vivo = false;
    };
  }, [uid]);

  const ativar = async () => {
    setOcupado(true);
    try {
      const { enablePush } = await import("@/lib/notificacoes");
      const r = await enablePush();
      if (r.status === "registered" || r.status === "already-granted") {
        setRegistrado(true);
        toast.success("Notificações ativadas neste celular!");
        const { data } = await supabase.auth.getSession();
        const jwt = data.session?.access_token;
        if (jwt) {
          try {
            const resp = await fetch("/api/public/push-teste", {
              method: "POST",
              headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
              body: JSON.stringify({ token: r.token }),
            });
            const info = (await resp.json()) as { enviados?: number; erro?: string; detalhe?: string };
            if (!resp.ok || (info.enviados ?? 0) === 0) {
              toast.error(
                "Ativado, mas a notificação de teste não chegou: " +
                  (info.erro ?? info.detalhe ?? "tente novamente."),
                { duration: 8000 }
              );
            } else {
              toast.success("Enviei uma notificação de teste agora. Confira na tela do celular!");
            }
          } catch {
            toast.error("Ativado, mas não consegui enviar a notificação de teste.");
          }
        }
      } else if (r.status === "open-in-new-tab") {

      } else if (r.status === "open-in-new-tab") {
        toast.error("Abra o site osuperct.com direto no navegador do celular para ativar.");
      } else if (r.status === "denied") {
        toast.error("Você precisa permitir as notificações nas configurações do navegador.");
      } else if (r.status === "unsupported") {
        toast.error("Este navegador não aceita notificações.");
      } else {
        toast.error("As notificações ainda não estão configuradas.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ativar as notificações.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
    {registrado === false && !avisoFechado && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
        <div className="animate-pulse-slow w-full max-w-sm rounded-xl border-2 border-primary bg-card p-5 text-center shadow-2xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Avisos do Super CT</p>
          <h2 className="mt-2 font-display text-xl tracking-tight text-foreground">
            ATIVE AS NOTIFICAÇÕES!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Toque no botão abaixo e permita as notificações para receber os recados do professor
            neste celular.
          </p>
          <button
            type="button"
            onClick={ativar}
            disabled={ocupado}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground disabled:opacity-60"
          >
            <Bell className="size-4 shrink-0" /> ATIVAR AGORA
          </button>
          <button
            type="button"
            onClick={() => setAvisoFechado(true)}
            className="mt-3 w-full rounded-md border border-border px-4 py-2 font-display text-xs tracking-tight text-muted-foreground"
          >
            FAZER DEPOIS
          </button>
        </div>
      </div>
    )}
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <h2 className="font-display text-sm tracking-tight text-foreground">NOTIFICAÇÕES</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {registrado
          ? "Este celular está registrado e vai receber os recados do Super CT."
          : "Ative para receber os recados do professor direto no celular."}
      </p>
      <button
        type="button"
        onClick={ativar}
        disabled={ocupado}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground disabled:opacity-60"
      >
        <Bell className="size-4 shrink-0" />
        {registrado ? "REGISTRAR NOVAMENTE" : "ATIVAR NOTIFICAÇÕES"}
      </button>
    </section>
    </>
  );
}
