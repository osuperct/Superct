import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function BotaoSair({ className }: { className?: string }) {
  const [logado, setLogado] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;
    async function checar() {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      setLogado(!!data.session);
    }
    void checar();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setLogado(!!s));
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!logado) return null;

  return (
    <button
      type="button"
      aria-label="Sair"
      title="Sair"
      onClick={async () => {
        await supabase.auth.signOut();
        toast.success("Você saiu da conta.");
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur-md transition-colors hover:bg-background hover:text-primary active:scale-95",
        className
      )}
    >
      <LogOut className="size-[18px]" />
    </button>
  );
}
