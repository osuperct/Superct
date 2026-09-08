import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SupabaseComPapeis = {
  from: (t: "user_roles") => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        in: (c: string, v: string[]) => { maybeSingle: () => Promise<{ data: unknown }> };
      };
    };
  };
};

async function ehEquipe(supabase: SupabaseComPapeis, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["professor", "adm"])
    .maybeSingle();
  return Boolean(data);
}

async function garantirEquipe(supabase: SupabaseComPapeis, userId: string) {
  if (!(await ehEquipe(supabase, userId))) throw new Error("Acesso restrito à equipe.");
}

const entrada = z.object({
  titulo: z.string().trim().min(2).max(80),
  mensagem: z.string().trim().min(2).max(300),
  link: z.string().trim().max(300).optional(),
});

/** Envia a notificação para os responsáveis de alunos com matrícula ativa. */
export const enviarPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entrada.parse(data))
  .handler(async ({ data, context }) => {
    await garantirEquipe(context.supabase as never, context.userId);

    const chave = process.env["WEBPUSHR_KEY"] ?? "";
    const token = process.env["WEBPUSHR_AUTH_TOKEN"] ?? "";
    if (!chave || !token) {
      return { ok: false as const, erro: "As notificações ainda não estão configuradas no servidor." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: alunos } = await supabaseAdmin
      .from("alunos")
      .select("user_id, matricula")
      .not("matricula", "is", null);
    const responsaveis = [...new Set((alunos ?? []).map((a) => a.user_id))];
    if (responsaveis.length === 0) return { ok: false as const, erro: "Nenhum aluno com matrícula ativa." };

    const { data: aparelhos } = await supabaseAdmin
      .from("push_aparelhos")
      .select("sid, user_id")
      .in("user_id", responsaveis);
    const sids = [...new Set((aparelhos ?? []).map((a) => a.sid))];
    if (sids.length === 0) {
      return { ok: false as const, erro: "Nenhum celular ativou as notificações ainda." };
    }

    const resposta = await fetch("https://api.webpushr.com/v1/notification/send/sid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        webpushrKey: chave,
        webpushrAuthToken: token,
      },
      body: JSON.stringify({
        title: data.titulo,
        message: data.mensagem,
        target_url: data.link && data.link.length > 0 ? data.link : "https://osuperct.com",
        sid: sids,
      }),
    });

    const corpo = (await resposta.json().catch(() => null)) as { description?: string } | null;
    if (!resposta.ok) {
      console.error("webpushr", resposta.status, corpo);
      return { ok: false as const, erro: corpo?.description ?? "O serviço de notificação recusou o envio." };
    }
    return { ok: true as const, enviados: sids.length };
  });

/** Lista os responsáveis de alunos ativos que ainda não ativaram as notificações. */
export const listarSemPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirEquipe(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: alunos } = await supabaseAdmin
      .from("alunos")
      .select("user_id, matricula")
      .not("matricula", "is", null);
    const responsaveis = [...new Set((alunos ?? []).map((a) => a.user_id))];
    if (responsaveis.length === 0) return [];

    const { data: aparelhos } = await supabaseAdmin
      .from("push_aparelhos")
      .select("user_id")
      .in("user_id", responsaveis);
    const comPush = new Set((aparelhos ?? []).map((a) => a.user_id));

    const { data: perfis } = await supabaseAdmin
      .from("perfis")
      .select("id, nome_responsavel, telefone")
      .in("id", responsaveis.filter((id) => !comPush.has(id)));

    return (perfis ?? [])
      .map((p) => ({
        id: p.id,
        nome: p.nome_responsavel ?? "",
        telefone: p.telefone ?? "",
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  });
