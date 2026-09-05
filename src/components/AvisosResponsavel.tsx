import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  type Aviso,
  type EstadoNotificacao,
  agruparPorMes,
  comImagens,
  dataCurta,
  estadoNotificacao,
  listarAvisos,
  listarLidos,
  marcarLido,
  mesAtual,
  notificarAparelho,
  pedirPermissao,
} from "@/lib/avisos";

export function AvisosResponsavel({ uid }: { uid: string }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const [lidos, setLidos] = useState<Set<string>>(new Set());
  const [permissao, setPermissao] = useState<EstadoNotificacao>("pendente");
  const [abertos, setAbertos] = useState<Set<string>>(new Set([mesAtual()]));

  const carregar = useCallback(async () => {
    const [avisos, jaLidos] = await Promise.all([listarAvisos(), listarLidos(uid)]);
    setLista(avisos);
    setLidos(jaLidos);
  }, [uid]);

  useEffect(() => {
    void carregar();
    setPermissao(estadoNotificacao());
  }, [carregar]);

  useEffect(() => {
    const canal = supabase
      .channel("avisos-responsavel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "avisos" }, (payload) => {
        const novo = payload.new as Aviso;
        void comImagens([novo]).then((prontos) => {
          const comFoto = prontos[0] ?? novo;
          setLista((atual) => [comFoto, ...atual.filter((a) => a.id !== comFoto.id)]);
        });
        toast.info(novo.titulo, { description: novo.mensagem });
        notificarAparelho(`Super CT — ${novo.titulo}`, novo.mensagem);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  const naoLidos = lista.filter((a) => !lidos.has(a.id)).length;

  async function ativarNotificacoes() {
    const resultado = await pedirPermissao();
    setPermissao(resultado);
    if (resultado === "permitido") {
      notificarAparelho("Super CT", "Notificações ativadas! Você será avisado das mensagens.");
      toast.success("Notificações ativadas neste aparelho.");
    } else if (resultado === "negado") {
      toast.error("As notificações estão bloqueadas nas configurações do navegador.");
    }
  }

  async function marcar(id: string) {
    setLidos((atual) => new Set(atual).add(id));
    await marcarLido(uid, id);
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <BellRing className="size-4 text-primary" /> QUADRO DE AVISOS
        </h2>
        {naoLidos > 0 && (
          <span className="shrink-0 rounded-full bg-primary px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-primary-foreground">
            {naoLidos} nova{naoLidos > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Mensagens enviadas pelo Super CT para todos os responsáveis.
      </p>

      {permissao !== "permitido" && (
        <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
          {permissao === "pendente" && (
            <button
              type="button"
              onClick={() => void ativarNotificacoes()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 font-display text-xs tracking-tight text-primary-foreground"
            >
              <Bell className="size-4" /> ATIVAR NOTIFICAÇÕES NO CELULAR
            </button>
          )}
          {permissao === "abrir-em-nova-aba" && (
            <p className="text-xs text-muted-foreground">
              Para ativar as notificações, abra o app em uma aba do navegador (ou pela tela inicial do celular)
              e toque em ativar notificações.
            </p>
          )}
          {permissao === "negado" && (
            <p className="text-xs text-muted-foreground">
              As notificações estão bloqueadas. Libere as notificações deste site nas configurações do navegador.
            </p>
          )}
          {permissao === "indisponivel" && (
            <p className="text-xs text-muted-foreground">Este aparelho não permite notificações no navegador.</p>
          )}
        </div>
      )}

      {lista.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum aviso por enquanto.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {lista.map((a) => {
            const novo = !lidos.has(a.id);
            return (
              <li
                key={a.id}
                className={`rounded-md border p-3 ${novo ? "border-primary/60 bg-primary/5" : "border-border bg-background/40"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm tracking-tight">{a.titulo}</p>
                  {novo && (
                    <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Não lido" />
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.mensagem}</p>
                {a.imagem && (
                  <a href={a.imagem} target="_blank" rel="noreferrer">
                    <img
                      src={a.imagem}
                      alt={`Foto do aviso ${a.titulo}`}
                      loading="lazy"
                      className="mt-2 max-h-64 w-full rounded-md border border-border object-contain"
                    />
                  </a>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {dataCurta(a.created_at)}
                  </span>
                  {novo && (
                    <button
                      type="button"
                      onClick={() => void marcar(a.id)}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
                    >
                      <Check className="size-3" /> MARCAR COMO LIDO
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
