import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BUCKET_PRODUTOS, type Produto } from "@/lib/loja.functions";
import { supabase } from "@/integrations/supabase/client";

const TAMANHOS_PADRAO = ["4", "6", "8", "10", "12", "14", "16", "P", "M", "G", "GG"];
const SENHA_EXCLUSAO = "2802";

type Rascunho = {
  id?: string;
  nome: string;
  descricao: string;
  preco: string;
  pede_tamanho: boolean;
  tamanhos: string[];
  link_pagamento: string;
  ativo: boolean;
  ordem: string;
};

function paraRascunho(p: Produto): Rascunho {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao ?? "",
    preco: String(p.preco),
    pede_tamanho: p.pede_tamanho,
    tamanhos: p.tamanhos,
    link_pagamento: p.link_pagamento ?? "",
    ativo: p.ativo,
    ordem: String(p.ordem),
  };
}

const NOVO: Rascunho = {
  nome: "",
  descricao: "",
  preco: "",
  pede_tamanho: false,
  tamanhos: [],
  link_pagamento: "",
  ativo: true,
  ordem: "0",
};

async function carregarFoto(caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const { data, error } = await supabase.storage.from(BUCKET_PRODUTOS).download(caminho);
  if (error || !data) return null;
  return URL.createObjectURL(data);
}

export function ProdutosAdm() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, descricao, preco, imagem_url, pede_tamanho, tamanhos, link_pagamento, ativo, ordem")
        .order("ordem")
        .order("nome");
      if (error) throw error;
      const lista = await Promise.all(
        (data ?? []).map(async (l) => ({
          ...l,
          preco: Number(l.preco ?? 0),
          tamanhos: l.tamanhos ?? [],
          imagem: await carregarFoto(l.imagem_url),
        })),
      );
      setProdutos(lista as Produto[]);
    } catch {
      toast.error("Não foi possível carregar os produtos.");
      setProdutos([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gravar(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const preco = Number(editando.preco.replace(",", "."));
    if (editando.nome.trim().length < 2) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (!Number.isFinite(preco) || preco < 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setOcupado(true);
    try {
      const valores = {
        nome: editando.nome.trim(),
        descricao: editando.descricao.trim() || null,
        preco,
        pede_tamanho: editando.pede_tamanho,
        tamanhos: editando.pede_tamanho ? editando.tamanhos : [],
        link_pagamento: editando.link_pagamento.trim() || null,
        ativo: editando.ativo,
        ordem: Number(editando.ordem) || 0,
      };
      const { error } = editando.id
        ? await supabase.from("produtos").update(valores).eq("id", editando.id)
        : await supabase.from("produtos").insert(valores);
      if (error) throw error;
      toast.success("Produto salvo. A loja já está atualizada.");
      setEditando(null);
      await carregar();
    } catch {
      toast.error("Não foi possível salvar o produto.");
    } finally {
      setOcupado(false);
    }
  }

  async function apagar(p: Produto) {
    if (!window.confirm(`Excluir o produto ${p.nome}?`)) return;
    const senha = window.prompt("Digite a senha de exclusão:");
    if (senha === null) return;
    if (senha.trim() !== SENHA_EXCLUSAO) {
      toast.error("Senha incorreta.");
      return;
    }
    try {
      if (p.imagem_url) await supabase.storage.from(BUCKET_PRODUTOS).remove([p.imagem_url]);
      const { error } = await supabase.from("produtos").delete().eq("id", p.id);
      if (error) throw error;
      toast.success("Produto excluído.");
      await carregar();
    } catch {
      toast.error("Não foi possível excluir o produto.");
    }
  }

  async function trocarFoto(p: Produto, arquivo: File) {
    if (arquivo.size > 9_000_000) {
      toast.error("A foto deve ter até 9 MB.");
      return;
    }
    setOcupado(true);
    try {
      const extensao = (arquivo.name.split(".").pop() || "jpg").toLowerCase();
      const caminho = `${p.id}/${Date.now()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET_PRODUTOS)
        .upload(caminho, arquivo, { contentType: arquivo.type || "image/jpeg", upsert: true });
      if (erroUpload) throw erroUpload;
      const { error } = await supabase.from("produtos").update({ imagem_url: caminho }).eq("id", p.id);
      if (error) throw error;
      if (p.imagem_url && p.imagem_url !== caminho) {
        await supabase.storage.from(BUCKET_PRODUTOS).remove([p.imagem_url]);
      }
      toast.success("Foto atualizada.");
      await carregar();
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={aberto}
      >
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <ShoppingBag className="size-4 text-primary" /> LOJA E PRODUTOS
        </h2>
        {aberto ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-primary" />}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Cadastre uniformes, garrafas e itens personalizados. O valor alterado aqui aparece na loja assim que
        você salva.
      </p>

      {aberto && (
        <>
          <button
            type="button"
            onClick={() => setEditando(editando && !editando.id ? null : { ...NOVO })}
            className="mt-3 flex items-center gap-2 rounded-md bg-primary px-3 py-2 font-display text-[11px] tracking-tight text-primary-foreground"
          >
            <Plus className="size-4" /> {editando && !editando.id ? "FECHAR" : "NOVO PRODUTO"}
          </button>

      {editando && (
        <form onSubmit={(e) => void gravar(e)} className="mt-3 space-y-2 rounded-md border border-border bg-background/60 p-3">
          <Campo rotulo="Nome do produto">
            <input
              value={editando.nome}
              onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>
          <Campo rotulo="Descrição">
            <textarea
              value={editando.descricao}
              onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>
          <Campo rotulo="Valor (R$)">
            <input
              value={editando.preco}
              onChange={(e) => setEditando({ ...editando, preco: e.target.value })}
              inputMode="decimal"
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>
          <Campo rotulo="Link de pagamento no cartão (InfinityPay)">
            <input
              value={editando.link_pagamento}
              onChange={(e) => setEditando({ ...editando, link_pagamento: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>
          <Campo rotulo="Ordem de exibição">
            <input
              value={editando.ordem}
              onChange={(e) => setEditando({ ...editando, ordem: e.target.value })}
              inputMode="numeric"
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={editando.pede_tamanho}
              onChange={(e) =>
                setEditando({
                  ...editando,
                  pede_tamanho: e.target.checked,
                  tamanhos: e.target.checked && editando.tamanhos.length === 0 ? TAMANHOS_PADRAO : editando.tamanhos,
                })
              }
            />
            Este produto tem tamanhos
          </label>

          {editando.pede_tamanho && (
            <div className="flex flex-wrap gap-1.5">
              {TAMANHOS_PADRAO.map((t) => {
                const ativo = editando.tamanhos.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setEditando({
                        ...editando,
                        tamanhos: ativo
                          ? editando.tamanhos.filter((x) => x !== t)
                          : [...editando.tamanhos, t],
                      })
                    }
                    className={`min-w-9 rounded-md px-2 py-1 font-display text-[11px] tracking-tight ${
                      ativo ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={editando.ativo}
              onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
            />
            Mostrar na loja
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={ocupado}
              className="flex-1 rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground disabled:opacity-60"
            >
              {ocupado ? "SALVANDO…" : "SALVAR PRODUTO"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(null)}
              className="rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {produtos === null ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando produtos…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {produtos.map((p) => (
            <li key={p.id} className="rounded-md border border-border bg-background/60 p-3">
              <div className="flex items-start gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-card/60">
                  {p.imagem ? (
                    <img src={p.imagem} alt={`Foto de ${p.nome}`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-muted-foreground">
                      <ImagePlus className="size-5" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm tracking-tight">{p.nome}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ·{" "}
                    {p.ativo ? "na loja" : "oculto"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditando(paraRascunho(p))}
                      className="rounded-md border border-border px-3 py-1.5 font-display text-[11px] tracking-tight"
                    >
                      EDITAR
                    </button>
                    <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 font-display text-[11px] tracking-tight">
                      TROCAR FOTO
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void trocarFoto(p, f);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void apagar(p)}
                      className="flex items-center gap-1 rounded-md border border-destructive/60 px-3 py-1.5 font-display text-[11px] tracking-tight text-destructive"
                    >
                      <Trash2 className="size-3.5" /> EXCLUIR
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {produtos.length === 0 && <li className="text-xs text-muted-foreground">Nenhum produto cadastrado.</li>}
        </ul>
      )}
        </>
      )}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{rotulo}</span>
      {children}
    </label>
  );
}
