import { useCallback, useEffect, useState } from "react";
import { CheckCheck, ChevronDown, ChevronUp, Package } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type Pedido = {
  id: string;
  nome: string;
  telefone: string | null;
  produto_nome: string;
  tamanho: string | null;
  quantidade: number;
  valor_total: number;
  status: string;
  created_at: string;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PedidosAdm() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [aberto, setAberto] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos_loja")
      .select("id, nome, telefone, produto_nome, tamanho, quantidade, valor_total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Não foi possível carregar os pedidos.");
      setPedidos([]);
      return;
    }
    setPedidos((data ?? []) as Pedido[]);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function marcarEntregue(p: Pedido) {
    const { error } = await supabase
      .from("pedidos_loja")
      .update({ status: p.status === "entregue" ? "novo" : "entregue" })
      .eq("id", p.id);
    if (error) {
      toast.error("Não foi possível atualizar o pedido.");
      return;
    }
    await carregar();
  }

  const novos = (pedidos ?? []).filter((p) => p.status !== "entregue");

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={aberto}
      >
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <Package className="size-4 text-primary" /> PEDIDOS DA LOJINHA
          {novos.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">
              {novos.length} novo{novos.length > 1 ? "s" : ""}
            </span>
          )}
        </h2>
        {aberto ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-primary" />}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Pedidos feitos na loja do app, com produto, tamanho, quantidade, valor e contato de quem comprou.
      </p>

      {aberto && (
        <>
          {pedidos === null ? (
            <p className="mt-3 text-xs text-muted-foreground">Carregando pedidos…</p>
          ) : pedidos.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pedidos.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-md border p-3 ${
                    p.status === "entregue"
                      ? "border-border bg-background/40 opacity-60"
                      : "border-primary/50 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-sm tracking-tight">
                        {p.quantidade}x {p.produto_nome}
                        {p.tamanho ? ` · TAM ${p.tamanho}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.nome}
                        {p.telefone ? ` · ${p.telefone}` : ""}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {brl(Number(p.valor_total))} ·{" "}
                        {new Date(p.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void marcarEntregue(p)}
                      className={`flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 font-display text-[11px] tracking-tight ${
                        p.status === "entregue"
                          ? "border border-border text-muted-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <CheckCheck className="size-3.5" />
                      {p.status === "entregue" ? "ENTREGUE" : "MARCAR ENTREGUE"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
