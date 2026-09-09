import { createFileRoute } from "@tanstack/react-router";

/**
 * Rotina mensal: publica a avaliação do mês dos alunos ativos e avisa os responsáveis.
 * Chamada pelo agendador do banco (dia 28, 20:00 de Brasília) com o token da rotina.
 */
async function executar(request: Request) {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: valido } = await supabaseAdmin.rpc("cron_token_valido", { _token: token });
  if (valido !== true) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await supabaseAdmin.rpc("publicar_avaliacoes_do_mes", {});
  if (error) {
    console.error("avaliacao-mensal", error.message);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  const resultado = (data ?? {}) as { alunos?: number; responsaveis?: string[]; referencia?: string };
  const responsaveis = resultado.responsaveis ?? [];
  let enviados = 0;

  const publicKey = process.env["VAPID_PUBLIC_KEY"] ?? "";
  const privateKey = process.env["VAPID_PRIVATE_KEY"] ?? "";
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:contato@osuperct.com";

  if (responsaveis.length > 0 && publicKey && privateKey) {
    const { data: inscricoes } = await supabaseAdmin
      .from("push_inscricoes")
      .select("endpoint, p256dh, auth")
      .in("user_id", responsaveis);

    if (inscricoes && inscricoes.length > 0) {
      const { buildPushPayload } = await import("@block65/webcrypto-web-push");
      const corpo = {
        data: {
          title: "Nova avaliação disponível",
          body: "A avaliação mensal do seu filho já está no app. Toque para ver o relatório.",
          url: "https://osuperct.com/conta",
        },
        options: { ttl: 60 * 60 * 24, urgency: "high" as const },
      };
      const expirados: string[] = [];
      for (const i of inscricoes) {
        try {
          const payload = await buildPushPayload(
            corpo,
            { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth }, expirationTime: null },
            { subject, publicKey, privateKey },
          );
          const r = await fetch(i.endpoint, payload);
          if (r.ok) enviados++;
          else if (r.status === 404 || r.status === 410) expirados.push(i.endpoint);
        } catch (e) {
          console.error("push avaliacao", e instanceof Error ? e.message : "falha");
        }
      }
      if (expirados.length > 0) {
        await supabaseAdmin.from("push_inscricoes").delete().in("endpoint", expirados);
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, referencia: resultado.referencia, alunos: resultado.alunos ?? 0, enviados }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
}

export const Route = createFileRoute("/api/public/avaliacao-mensal")({
  server: {
    handlers: {
      POST: ({ request }) => executar(request),
      GET: ({ request }) => executar(request),
    },
  },
});
