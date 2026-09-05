import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Share2, Trophy } from "lucide-react";
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
};

const MEDALHAS = ["text-amber-400", "text-slate-300", "text-amber-700"];

export default function RankingJogo({ pontos, fase, fim }: Props) {
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
    } catch {
      toast.error("Não foi possível salvar o apelido");
    } finally {
      setSalvando(false);
    }
  };

  const minhaPosicao = userId ? lista.findIndex((l) => l.user_id === userId) + 1 : 0;

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

  return (
    <section className="mt-6 rounded-lg border border-border bg-card/60 p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-tight text-primary">
          <Trophy className="size-4" /> Ranking dos jogadores
        </h2>
        <button
          type="button"
          onClick={compartilhar}
          className="flex items-center gap-1 rounded-full border border-primary px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-primary active:scale-95"
        >
          <Share2 className="size-3" /> Compartilhar
        </button>
      </header>

      {!userId && (
        <p className="mt-3 font-mono text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
          <Link to="/conta" className="text-primary underline">
            Entre na sua conta
          </Link>{" "}
          para escolher um apelido e entrar no ranking.
        </p>
      )}

      {userId && !apelido && (
        <div className="mt-3 space-y-2">
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
        <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
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
            key={l.user_id}
            className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
              l.user_id === userId ? "border border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground"
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
    </section>
  );
}
