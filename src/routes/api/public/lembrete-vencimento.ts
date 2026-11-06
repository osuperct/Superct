import { createFileRoute } from "@tanstack/react-router";

import { diasEntre, vencimentoIso } from "@/lib/financeiro";
import { planoDoContrato } from "@/lib/planoContrato";

/**
 * Rotina diária: lembra no celular os responsáveis 3 dias antes e no dia do vencimento
 * das mensalidades ainda não pagas. Chamada pelo agendador com o token da rotina.
 */
async function executar(request: Request) {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: valido } = await supabaseAdmin.rpc("cron_token_valido", { _token: token });
  if (valido !== true) return new Response("Unauthorized", { status: 401 });

  const agora = new Date(Date.now() - 3 * 3600_000);
  const hoje = agora.toISOString().slice(0, 10);
  const ref = `${hoje.slice(0, 7)}-01`;

  const [{ data: perfis }, { data: alunos }, { data: fichas }, { data: mens }] = await Promise.all([
    supabaseAdmin.from("perfis").select("id, aprovado, bloqueado_em"),
    supabaseAdmin.from("alunos").select("id, nome, user_id"),
    supabaseAdmin.from("fichas").select("aluno_id, dados, created_at").eq("tipo", "contrato").order("created_at", { ascending: false }),
    supabaseAdmin.from("mensalidades").select("aluno_id, ativo, pago, valor").eq("referencia", ref),
  ]);

  const ativos = new Set((perfis ?? []).filter((p) => p.aprovado && !p.bloqueado_em).map((p) => p.id));
  const lembretes: { alunoId: string; userId: string; nome: string; tipo: "3dias" | "hoje"; venc: string }[] = [];

  for (const a of alunos ?? []) {
    if (!ativos.has(a.user_id)) continue;
    const m = (mens ?? []).find((x) => x.aluno_id === a.id);
    if (m && (m.pago || !m.ativo)) continue;
    const ficha = (fichas ?? []).find((f) => f.aluno_id === a.id);
    if (!m && !ficha) continue;
    const plano = ficha ? planoDoContrato(a.id, (ficha.dados ?? {}) as Record<string, unknown>) : null;
    if (!m && plano?.inicio && plano.inicio.slice(0, 7) > ref.slice(0, 7)) continue;
    const venc = vencimentoIso(ref, plano?.vencimento);
    const faltam = diasEntre(hoje, venc);
    if (faltam === 3) lembretes.push({ alunoId: a.id, userId: a.user_id, nome: a.nome, tipo: "3dias", venc });
    else if (faltam === 0) lembretes.push({ alunoId: a.id, userId: a.user_id, nome: a.nome, tipo: "hoje", venc });
  }

  const publicKey = process.env["VAPID_PUBLIC_KEY"] ?? "";
  const privateKey = process.env["VAPID_PRIVATE_KEY"] ?? "";
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:contato@osuperct.com";
  let enviados = 0;
  const expirados: string[] = [];

  for (const l of lembretes) {
    const { error: dup } = await supabaseAdmin
      .from("lembretes_vencimento")
      .insert({ aluno_id: l.alunoId, referencia: ref, tipo: l.tipo });
    if (dup) continue; // já avisado
    if (!publicKey || !privateKey) continue;
    const { data: inscricoes } = await supabaseAdmin
      .from("push_inscricoes")
      .select("endpoint, p256dh, auth")
      .eq("user_id", l.userId);
    if (!inscricoes?.length) continue;
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const data = l.venc.split("-").reverse().join("/");
    const corpo = {
      data: {
        title: l.tipo === "hoje" ? "Mensalidade vence hoje" : "Mensalidade vence em 3 dias",
        body: `A mensalidade de ${l.nome.split(" ")[0]} vence ${l.tipo === "hoje" ? "hoje" : `em ${data}`}. Toque para pagar pelo app.`,
        url: "https://osuperct.com/conta",
      },
      options: { ttl: 60 * 60 * 24, urgency: "normal" as const },
    };
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
        console.error("push lembrete", e instanceof Error ? e.message : "falha");
      }
    }
  }
  if (expirados.length > 0) await supabaseAdmin.from("push_inscricoes").delete().in("endpoint", expirados);

  return new Response(JSON.stringify({ ok: true, hoje, lembretes: lembretes.length, enviados }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/lembrete-vencimento")({
  server: {
    handlers: {
      POST: ({ request }) => executar(request),
      GET: ({ request }) => executar(request),
    },
  },
});
