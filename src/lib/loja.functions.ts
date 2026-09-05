import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BUCKET_PRODUTOS = "produtos";

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  imagem: string | null;
  pede_tamanho: boolean;
  tamanhos: string[];
  link_pagamento: string | null;
  ativo: boolean;
  ordem: number;
};

type LinhaProduto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | string;
  imagem_url: string | null;
  pede_tamanho: boolean;
  tamanhos: string[] | null;
  link_pagamento: string | null;
  ativo: boolean;
  ordem: number;
};

async function assinar(linhas: LinhaProduto[]): Promise<Produto[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(
    linhas.map(async (l) => {
      let imagem: string | null = null;
      if (l.imagem_url) {
        const { data } = await supabaseAdmin.storage
          .from(BUCKET_PRODUTOS)
          .createSignedUrl(l.imagem_url, 60 * 60 * 12);
        imagem = data?.signedUrl ?? null;
      }
      return {
        ...l,
        preco: Number(l.preco ?? 0),
        tamanhos: l.tamanhos ?? [],
        imagem,
      };
    }),
  );
}

/** Lista os produtos da loja. Público: apenas os ativos. */
export const listarProdutos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ todos: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<Produto[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let consulta = supabaseAdmin
      .from("produtos")
      .select("id, nome, descricao, preco, imagem_url, pede_tamanho, tamanhos, link_pagamento, ativo, ordem")
      .order("ordem")
      .order("nome");
    if (!data.todos) consulta = consulta.eq("ativo", true);
    const { data: linhas, error } = await consulta;
    if (error) throw new Error("Não foi possível carregar os produtos.");
    return assinar((linhas ?? []) as LinhaProduto[]);
  });

async function garantirAdm(supabase: unknown, userId: string) {
  const cliente = supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data } = await cliente
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "adm")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito à administração.");
}

const esquemaProduto = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2).max(80),
  descricao: z.string().max(400).optional().nullable(),
  preco: z.number().min(0).max(100000),
  pede_tamanho: z.boolean(),
  tamanhos: z.array(z.string().min(1).max(6)).max(30),
  link_pagamento: z.string().max(500).optional().nullable(),
  ativo: z.boolean(),
  ordem: z.number().int().min(0).max(999),
});

/** Cria ou atualiza um produto (somente ADM). */
export const salvarProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => esquemaProduto.parse(d))
  .handler(async ({ data, context }) => {
    await garantirAdm(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const registro = {
      nome: data.nome.trim(),
      descricao: data.descricao?.trim() || null,
      preco: data.preco,
      pede_tamanho: data.pede_tamanho,
      tamanhos: data.tamanhos,
      link_pagamento: data.link_pagamento?.trim() || null,
      ativo: data.ativo,
      ordem: data.ordem,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("produtos").update(registro).eq("id", data.id);
      if (error) throw new Error("Não foi possível salvar o produto.");
      return { ok: true as const, id: data.id };
    }
    const { data: criado, error } = await supabaseAdmin
      .from("produtos")
      .insert(registro)
      .select("id")
      .single();
    if (error || !criado) throw new Error("Não foi possível criar o produto.");
    return { ok: true as const, id: criado.id };
  });

/** Exclui um produto (somente ADM). */
export const excluirProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await garantirAdm(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("produtos").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível excluir o produto.");
    return { ok: true as const };
  });

/** Envia a foto de um produto (somente ADM). */
export const enviarFotoProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        nomeArquivo: z.string().min(3).max(120),
        tipo: z.string().min(3).max(60),
        conteudoBase64: z.string().min(10).max(14_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await garantirAdm(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(data.conteudoBase64, "base64");
    const ext = (data.nomeArquivo.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
    const caminho = `${data.id}/${Date.now()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_PRODUTOS)
      .upload(caminho, bytes, { contentType: data.tipo, upsert: true });
    if (error) throw new Error("Não foi possível enviar a foto.");
    const { error: erroUpdate } = await supabaseAdmin
      .from("produtos")
      .update({ imagem_url: caminho })
      .eq("id", data.id);
    if (erroUpdate) throw new Error("Não foi possível salvar a foto do produto.");
    return { ok: true as const };
  });
