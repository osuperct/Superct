import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatarLinkWhatsApp } from "@/lib/notificacoes";

type Item = { id: string; nome: string; telefone: string };

export function ResponsaveisSemNotificacao() {
  const [lista, setLista] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    const [{ data: perfis }, { data: tokens }] = await Promise.all([
      supabase.from("perfis").select("id, nome_responsavel, telefone"),
      supabase.from("tokens_push").select("user_id"),
    ]);
    const comToken = new Set((tokens ?? []).map((t) => t.user_id));
    setLista(
      (perfis ?? [])
        .filter((p) => !comToken.has(p.id))
        .map((p) => ({
          id: p.id,
          nome: p.nome_responsavel || "(sem nome)",
          telefone: p.telefone ?? "",
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    );
    setCarregando(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm tracking-tight text-foreground">
          SEM NOTIFICAÇÃO ATIVA ({lista.length})
        </h2>
        <button
          type="button"
          onClick={() => void carregar()}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          <RefreshCw className="size-3" /> Atualizar
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Esses responsáveis ainda não ativaram a notificação no celular. Avise pelo WhatsApp para
        abrirem osuperct.com no celular e tocarem em "ATIVAR NOTIFICAÇÕES".
      </p>
      {carregando ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Todos já estão recebendo notificações.</p>
      ) : (
        <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto">
          {lista.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/50 p-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{p.nome}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {p.telefone || "sem telefone"}
                </p>
              </div>
              {p.telefone ? (
                <a
                  href={formatarLinkWhatsApp(
                    p.telefone,
                    "Super CT",
                    'Abra o site osuperct.com no seu celular, entre na sua conta e toque em "ATIVAR NOTIFICAÇÕES" para receber os recados do Super CT.'
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 font-display text-[11px] tracking-tight text-primary-foreground"
                >
                  <MessageCircle className="size-3" /> AVISAR
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
