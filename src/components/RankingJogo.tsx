import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Share2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listarRanking, meuRegistro, salvarApelido, salvarPontuacao, type LinhaRanking } from "@/lib/ranking";

type Props = {
  /** pontuação da partida atual */
  pontos: number;
  /** fase alcançada */
  fase: number;
  /** true quando a partida acabou — dispara o registro no ranking */
  fim: boolean;
  /** chamado após salvar o apelido, para direcionar ao jogo */
  onApelidoSalvo?: () => void;
};

const MEDALHAS = ["text-amber-400", "text-slate-300", "text-amber-700"];

export default function RankingJogo({ pontos, fase, fim, onApelidoSalvo }: Props) {
  const [aberto, setAberto] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [apelido, setApelido] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [lista, setLista] = useState<LinhaRanking[]>([]);

  const carregarLista = useCallback(() => {
    listarRanking().then(setLista).catch(() => setLista([]));
  }, []);

  useEffect(() => {
    carregarLista();
    const aplicar = async (id: string | null) => {
      setUserId(id);
      if (!id) {
        setApelido(null);
        return;
      }
      try {
        const reg = await meuRegistro(id);
        setApelido(reg?.apelido ?? null);
      } catch {
        setApelido(null);
      }
    };
    void supabase.auth.getSession().then(({ data }) => aplicar(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void aplicar(s?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [carregarLista]);

  /* ao terminar a partida, guarda a melhor pontuação */
  useEffect(() => {
    if (!fim || !userId || !apelido) return;
    let ativo = true;
    salvarPontuacao(userId, apelido, pontos, fase)
      .then(() => {
        if (ativo) carregarLista();
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [fim, userId, apelido, pontos, fase, carregarLista]);

  const confirmarApelido = async () => {
    if (!userId) return;
    setSalvando(true);
    try {
      const novo = await salvarApelido(userId, rascunho);
      setApelido(novo);
      setRascunho("");
      toast.success(`Apelido salvo: ${novo}`);
      carregarLista();
      onApelidoSalvo?.();
    } catch {
      toast.error("Não foi possível salvar o apelido");
    } finally {
      setSalvando(false);
    }
  };

  const minhaPosicao = apelido ? lista.findIndex((l) => l.apelido === apelido) + 1 : 0;

  const compartilhar = async () => {
    const topo = lista
      .slice(0, 5)
      .map((l, i) => `${i + 1}º ${l.apelido} — ${l.pontos} pts (fase ${l.fase})`)
      .join("\n");
    const meu =
      minhaPosicao > 0 && apelido
        ? `\n\nEu (${apelido}) estou em ${minhaPosicao}º lugar!`
        : "";
    const texto = `🏆 Ranking do Super Jogo — Super CT\n\n${topo}${meu}\n\nJogue você também: ${window.location.origin}/jogo`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ranking do Super Jogo — Super CT", text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      toast.success("Ranking copiado! Cole no WhatsApp para compartilhar.");
    } catch {
      /* usuário cancelou */
    }
  };

  const top3 = lista.slice(0, 3);

  return (
    <>
      {/* botão flutuante/preview que abre a tela separada */}
      <button
        type="button"
        onClick={() => {
          setAberto(true);
          carregarLista();
        }}
        className="group mt-8 flex w-full items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-left active:scale-[0.98]"
      >
        <span className="flex items-center gap-2 font-display text-sm uppercase tracking-tight text-primary">
          <Trophy className="size-4" /> Ranking dos jogadores
        </span>
        <span className="flex -space-x-2">
          {top3.length === 0 ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
              -
            </span>
          ) : (
            top3.map((l, i) => (
              <span
                key={l.apelido}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[9px] font-bold uppercase ${
                  i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-black" : "bg-amber-700 text-white"
                }`}
                title={`${i + 1}º ${l.apelido}`}
              >
                {l.apelido.slice(0, 1)}
              </span>
            ))
          )}
        </span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
          <section className="flex h-[92vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-card p-4 shadow-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-2xl">
            <header className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-tight text-primary">
                <Trophy className="size-4" /> Ranking dos jogadores
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={compartilhar}
                  className="flex items-center gap-1 rounded-full border border-primary px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-primary active:scale-95"
                >
                  <Share2 className="size-3" /> Compartilhar
                </button>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="rounded-full border border-border p-1.5 text-muted-foreground active:scale-95"
                  aria-label="Fechar ranking"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto py-3">
              {!userId && (
                <p className="font-mono text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
                  <Link to="/conta" className="text-primary underline">
                    Entre na sua conta
                  </Link>{" "}
                  para escolher um apelido e entrar no ranking.
                </p>
              )}

              {userId && !apelido && (
                <div className="space-y-2">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Escolha seu apelido de jogador (até 20 letras)
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={rascunho}
                      onChange={(e) => setRascunho(e.target.value.slice(0, 20))}
                      maxLength={20}
                      placeholder="Ex.: Miguelzão"
                      className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={salvando || !rascunho.trim()}
                      onClick={() => void confirmarApelido()}
                      className="rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-primary disabled:opacity-40"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              {userId && apelido && (
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Jogando como <span className="text-primary">{apelido}</span>
                  {minhaPosicao > 0 && <> • sua posição: {minhaPosicao}º</>}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setRascunho(apelido);
                      setApelido(null);
                    }}
                    className="ml-1 underline"
                  >
                    trocar
                  </button>
                </p>
              )}

              <ol className="mt-3 space-y-1">
                {lista.length === 0 && (
                  <li className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Ninguém pontuou ainda — seja o primeiro!
                  </li>
                )}
                {lista.map((l, i) => (
                  <li
                    key={`${l.apelido}-${i}`}
                    className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                      l.apelido === apelido ? "border border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {i < 3 ? (
                        <Crown className={`size-3 ${MEDALHAS[i]}`} />
                      ) : (
                        <span className="w-3 text-center">{i + 1}</span>
                      )}
                      <span className="truncate">{l.apelido}</span>
                    </span>
                    <span>
                      {l.pontos} pts • fase {l.fase}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-2 w-full rounded-full border border-border py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground active:scale-95"
            >
              Fechar
            </button>
          </section>
        </div>
      )}
    </>
  );
}
