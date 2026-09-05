import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, ShoppingBag, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { listarProdutos, type Produto } from "@/lib/loja.functions";

const LINK_INFINITEPAY = "https://checkout.infinitepay.io/super_ct/gF9RQ9e7qg";


export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja Super CT — Uniformes e Personalizados" },
      {
        name: "description",
        content:
          "Compre uniforme, garrafa e itens personalizados do Super CT. Pague por Pix ou cartão de crédito direto pelo aplicativo.",
      },
      { property: "og:title", content: "Loja Super CT — Uniformes e Personalizados" },
      {
        property: "og:description",
        content: "Uniforme infantil e adulto, garrafa e itens personalizados do Super CT, com Pix ou cartão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <Casca>
      <p className="text-sm text-muted-foreground">Não foi possível abrir a loja agora.</p>
    </Casca>
  ),
  notFoundComponent: () => (
    <Casca>
      <p className="text-sm text-muted-foreground">Produto não encontrado.</p>
    </Casca>
  ),
  component: LojaPage,
});

function Casca({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-sm px-5 py-8">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Início
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl leading-tight tracking-tighter">
          <ShoppingBag className="size-6 shrink-0 text-primary" />
          <span>
            LOJA <span className="text-primary">SUPER CT</span>
          </span>
        </h1>
        <div className="mt-6 space-y-6">{children}</div>
      </main>
    </div>
  );
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function LojaPage() {
  const listar = useServerFn(listarProdutos);
  const [produtos, setProdutos] = useState<Produto[] | null>(null);

  const carregar = useCallback(async () => {
    try {
      setProdutos(await listar({ data: {} }));
    } catch {
      setProdutos([]);
    }
  }, [listar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <Casca>
      <p className="text-sm text-muted-foreground">
        Uniformes, garrafas e itens personalizados do Super CT. Escolha o tamanho, confira o valor e pague por
        Pix ou cartão de crédito.
      </p>

      {produtos === null ? (
        <p className="text-xs text-muted-foreground">Carregando produtos…</p>
      ) : produtos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum produto disponível no momento.</p>
      ) : (
        <ul className="space-y-5">
          {produtos.map((p) => (
            <li key={p.id}>
              <CartaoProduto produto={p} />
            </li>
          ))}
        </ul>
      )}
    </Casca>
  );
}

const INFANTIS = new Set(["4", "6", "8", "10", "12", "14", "16"]);

function CartaoProduto({ produto }: { produto: Produto }) {
  const [tamanho, setTamanho] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [pagando, setPagando] = useState(false);
  const [aguardando, setAguardando] = useState(false);


  const total = produto.preco * quantidade;

  const infantis = produto.tamanhos.filter((t) => INFANTIS.has(t));
  const adultos = produto.tamanhos.filter((t) => !INFANTIS.has(t));

  function abrirPagamento() {
    if (produto.pede_tamanho && !tamanho) {
      toast.error("Escolha o tamanho antes de comprar.");
      return;
    }
    setPagando(true);
  }

  const linkPagamento = produto.link_pagamento ?? LINK_INFINITEPAY;

  const linkWhats = `https://wa.me/5535988223596?text=${encodeURIComponent(
    `Olá! Concluí o pagamento no app do Super CT: ${quantidade}x ${produto.nome}${
      tamanho ? ` — tamanho ${tamanho}` : ""
    } — total ${brl(total)}.`,
  )}`;

  useEffect(() => {
    if (!aguardando) return;
    function aoVoltar() {
      if (document.visibilityState !== "visible") return;
      setAguardando(false);
      setPagando(false);
      toast.success("Enviando a confirmação do seu pedido no WhatsApp…");
      window.location.href = linkWhats;
    }
    window.addEventListener("focus", aoVoltar);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.removeEventListener("focus", aoVoltar);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [aguardando, linkWhats]);



  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card/40">
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-background/60">
        {produto.imagem ? (
          <img
            src={produto.imagem}
            alt={`Foto do produto ${produto.nome} do Super CT`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="size-8" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Foto do produto</span>
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h2 className="font-display text-lg tracking-tight">{produto.nome.toUpperCase()}</h2>
          {produto.descricao && <p className="mt-1 text-xs text-muted-foreground">{produto.descricao}</p>}
          <p className="mt-2 font-display text-xl tracking-tight text-primary">{brl(produto.preco)}</p>
        </div>

        {produto.pede_tamanho && (
          <div className="space-y-2">
            {infantis.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Infantil
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {infantis.map((t) => (
                    <BotaoTamanho key={t} t={t} ativo={tamanho === t} onClick={() => setTamanho(t)} />
                  ))}
                </div>
              </div>
            )}
            {adultos.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Adulto</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {adultos.map((t) => (
                    <BotaoTamanho key={t} t={t} ativo={tamanho === t} onClick={() => setTamanho(t)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Quantidade
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="size-8 rounded-md border border-border font-display text-sm"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="w-6 text-center font-display text-sm">{quantidade}</span>
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.min(20, q + 1))}
              className="size-8 rounded-md border border-border font-display text-sm"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        {!pagando ? (
          <button
            type="button"
            onClick={abrirPagamento}
            className="w-full rounded-md bg-primary px-4 py-3 font-display tracking-tight text-primary-foreground"
          >
            COMPRAR — {brl(total)}
          </button>
        ) : (
          <div className="space-y-3 rounded-md border border-primary/50 bg-primary/5 p-3">
            <p className="font-display text-sm tracking-tight">
              {produto.nome.toUpperCase()}
              {tamanho ? ` · TAM ${tamanho}` : ""} · {quantidade}x · {brl(total)}
            </p>

            <div className="space-y-2 rounded-md border border-border bg-background/60 p-3">
              <p className="flex items-center gap-2 font-display text-xs tracking-tight">
                <CreditCard className="size-4 text-primary" /> PAGAR COM PIX OU CARTÃO
              </p>
              <p className="text-xs text-muted-foreground">
                O pagamento é feito na InfinitePay do Super CT: escolha Pix ou cartão de crédito na própria
                tela de pagamento.
              </p>
              <a
                href={linkPagamento}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-md bg-primary px-4 py-2.5 text-center font-display text-xs tracking-tight text-primary-foreground"
              >
                IR PARA O PAGAMENTO — {brl(total)}
              </a>
              <p className="text-[11px] text-muted-foreground">
                Depois de pagar, confirme o pedido no WhatsApp{" "}
                <a
                  href={`https://wa.me/5535988223596?text=${encodeURIComponent(
                    `Olá! Comprei ${quantidade}x ${produto.nome}${tamanho ? ` tamanho ${tamanho}` : ""} — ${brl(total)}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  35 98822-3596
                </a>{" "}
                para informar o tamanho e a quantidade.
              </p>
            </div>


            <button
              type="button"
              onClick={() => setPagando(false)}
              className="w-full rounded-md border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function BotaoTamanho({ t, ativo, onClick }: { t: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-10 rounded-md px-2.5 py-1.5 font-display text-xs tracking-tight ${
        ativo ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
      }`}
    >
      {t}
    </button>
  );
}
