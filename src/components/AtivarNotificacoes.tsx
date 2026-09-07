import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AtivarNotificacoes({ uid }: { uid: string }) {
  const [registrado, setRegistrado] = useState<boolean | null>(null);
  const [ocupado, setOcupado] = useState(false);

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
  );
}
