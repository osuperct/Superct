import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SupabaseComPapeis = {
  from: (t: "user_roles") => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        in: (c: string, v: string[]) => Promise<{ data: unknown[] | null }>;
      };
    };
  };
};

async function ehEquipe(supabase: SupabaseComPapeis, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["professor", "adm"]);
  return (data ?? []).length > 0;
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
    if (!(await ehEquipe(context.supabase as never, context.userId))) {
      return { ok: false as const, erro: "Acesso restrito à equipe." };
    }

    const publicKey = process.env["VAPID_PUBLIC_KEY"] ?? "";
    const privateKey = process.env["VAPID_PRIVATE_KEY"] ?? "";
    const subject = process.env["VAPID_SUBJECT"] ?? "mailto:contato@osuperct.com";
    if (!publicKey || !privateKey) {
      return { ok: false as const, erro: "As notificações ainda não estão configuradas no servidor." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: alunos } = await supabaseAdmin
      .from("alunos")
      .select("user_id, matricula")
      .not("matricula", "is", null);
    const responsaveis = [...new Set((alunos ?? []).map((a) => a.user_id))];
    if (responsaveis.length === 0) return { ok: false as const, erro: "Nenhum aluno com matrícula ativa." };

    const { data: inscricoes } = await supabaseAdmin
      .from("push_inscricoes")
      .select("endpoint, p256dh, auth")
      .in("user_id", responsaveis);
    if (!inscricoes || inscricoes.length === 0) {
      return { ok: false as const, erro: "Nenhum celular ativou as notificações ainda." };
    }

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = { subject, publicKey, privateKey };
    const corpo = {
      data: {
        title: data.titulo,
        body: data.mensagem,
        url: data.link && data.link.length > 0 ? data.link : "https://osuperct.com",
      },
      options: { ttl: 60 * 60 * 12, urgency: "high" as const },
    };

    let enviados = 0;
    const expirados: string[] = [];
    let ultimoErro = "";

    for (const i of inscricoes) {
      try {
        const assinatura = {
          endpoint: i.endpoint,
          keys: { p256dh: i.p256dh, auth: i.auth },
          expirationTime: null,
        };
        const payload = await buildPushPayload(corpo, assinatura, vapid);
        const r = await fetch(i.endpoint, payload);
        if (r.ok) enviados++;
        else if (r.status === 404 || r.status === 410) expirados.push(i.endpoint);
        else ultimoErro = `${r.status} ${await r.text().catch(() => "")}`.slice(0, 120);
      } catch (e) {
        ultimoErro = e instanceof Error ? e.message : "falha";
      }
    }

    if (expirados.length > 0) {
      await supabaseAdmin.from("push_inscricoes").delete().in("endpoint", expirados);
    }

    if (enviados === 0) {
      console.error("push falhou", ultimoErro, "expirados:", expirados.length);
      return {
        ok: false as const,
        erro:
          expirados.length > 0
            ? "Os aparelhos registrados expiraram. Os responsáveis precisam ativar de novo."
            : ultimoErro || "Nenhum aparelho recebeu a notificação.",
      };
    }
    return { ok: true as const, enviados };
  });

/** Lista os responsáveis de alunos ativos que ainda não ativaram as notificações. */
export const listarSemPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await ehEquipe(context.supabase as never, context.userId))) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: alunos } = await supabaseAdmin
      .from("alunos")
      .select("user_id, matricula")
      .not("matricula", "is", null);
    const responsaveis = [...new Set((alunos ?? []).map((a) => a.user_id))];
    if (responsaveis.length === 0) return [];

    const { data: inscricoes } = await supabaseAdmin
      .from("push_inscricoes")
      .select("user_id")
      .in("user_id", responsaveis);
    const comPush = new Set((inscricoes ?? []).map((a) => a.user_id));

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
