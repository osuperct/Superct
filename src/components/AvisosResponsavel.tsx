import { useCallback, useEffect, useState } from "react";
import { BellRing, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  type Aviso,
  agruparPorMes,
  comImagens,
  dataCurta,
  listarAvisos,
  listarLidos,
  marcarLido,
} from "@/lib/avisos";

export function AvisosResponsavel({ uid }: { uid: string }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const [lidos, setLidos] = useState<Set<string>>(new Set());
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Avisos não lidos ficam expandidos; lidos começam minimizados.
    setExpandidos(new Set(lista.filter((a) => !lidos.has(a.id)).map((a) => a.id)));
  }, [lista, lidos]);

  const carregar = useCallback(async () => {
    const [avisos, jaLidos] = await Promise.all([listarAvisos(), listarLidos(uid)]);
    setLista(avisos);
    setLidos(jaLidos);
  }, [uid]);

  useEffect(() => {
    void carregar();
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
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  const naoLidos = lista.filter((a) => !lidos.has(a.id)).length;

  async function marcar(id: string) {
    setLidos((atual) => new Set(atual).add(id));
    await marcarLido(uid, id);
  }

  function toggleMes(chave: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }

  function toggleItem(id: string) {
    setExpandidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  const porMes = agruparPorMes(lista);

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

      {lista.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum aviso por enquanto.</p>
      ) : (
        <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto rounded-md border border-border bg-background/20 p-2">
          {porMes.map((grupo) => {
            const aberto = abertos.has(grupo.chave);
            const naoLidosMes = grupo.avisos.filter((a) => !lidos.has(a.id)).length;
            return (
              <div key={grupo.chave} className="rounded-md border border-border bg-background/40">
                <button
                  type="button"
                  onClick={() => toggleMes(grupo.chave)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                  aria-expanded={aberto}
                >
                  <span className="flex items-center gap-2 font-display text-sm tracking-tight">
                    {grupo.rotulo}
                    {naoLidosMes > 0 && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary-foreground">
                        {naoLidosMes} nova{naoLidosMes > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                  {aberto ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
                {aberto && (
                  <ul className="space-y-2 border-t border-border px-3 pb-3 pt-2">
                    {grupo.avisos.map((a) => {
                      const novo = !lidos.has(a.id);
                      const aberto = novo || expandidos.has(a.id);
                      return (
                        <li
                          key={a.id}
                          className={`rounded-md border p-3 ${novo ? "border-primary/60 bg-primary/5" : "border-border bg-background/60"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-display text-sm tracking-tight">{a.titulo}</p>
                            {novo && (
                              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Não lido" />
                            )}
                          </div>
                          {aberto && (
                            <>
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
                            </>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                              {dataCurta(a.created_at)}
                            </span>
                            {novo ? (
                              <button
                                type="button"
                                onClick={() => void marcar(a.id)}
                                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
                              >
                                <Check className="size-3" /> MARCAR COMO LIDO
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleItem(a.id)}
                                className="rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
                              >
                                {aberto ? "OCULTAR" : "MOSTRAR"}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
