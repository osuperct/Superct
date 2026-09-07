import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export const Route = createFileRoute("/api/public/enviar-push")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env["SUPABASE_URL"];
        const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
        const FIREBASE_MESSAGING_API_KEY = process.env["FIREBASE_MESSAGING_API_KEY"];

        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return json({ erro: "Backend não configurado neste servidor." }, 500);
        }
        if (!LOVABLE_API_KEY || !FIREBASE_MESSAGING_API_KEY) {
          return json({ erro: "Configuração de notificações incompleta." }, 500);
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token || token.split(".").length !== 3) {
          return json({ erro: "Não autorizado." }, 401);
        }

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: {
            fetch: supabaseFetch(SUPABASE_PUBLISHABLE_KEY),
            headers: { Authorization: `Bearer ${token}` },
          },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claims, error: erroClaims } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (erroClaims || !userId) {
          return json({ erro: "Não autorizado." }, 401);
        }

        const { data: ehProfessor } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "professor" as "professor" | "responsavel" | "adm",
        });
        if (!ehProfessor) {
          return json({ erro: "Apenas professor pode enviar recados." }, 403);
        }

        let corpo: { titulo?: string; mensagem?: string; caminho?: string };
        try {
          corpo = (await request.json()) as typeof corpo;
        } catch {
          return json({ erro: "Dados inválidos." }, 400);
        }
        const titulo = (corpo.titulo ?? "").trim();
        const mensagem = (corpo.mensagem ?? "").trim();
        const caminho = (corpo.caminho ?? "").trim();
        if (!titulo || !mensagem) {
          return json({ erro: "Título e mensagem são obrigatórios." }, 400);
        }

        const agora = new Date();
        const referencia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;

        const { data: mensalidades, error: erroMens } = await supabase
          .from("mensalidades")
          .select("user_id")
          .eq("referencia", referencia)
          .eq("ativo", true);
        if (erroMens) {
          return json({ erro: "Erro ao buscar alunos ativos: " + erroMens.message }, 500);
        }

        const userIds = Array.from(new Set((mensalidades ?? []).map((m) => m.user_id)));
        if (userIds.length === 0) {
          return json({ enviados: 0, falhas: 0, total: 0 });
        }

        const { data: tokens, error: erroTokens } = await supabase
          .from("tokens_push")
          .select("token")
          .in("user_id", userIds);
        if (erroTokens) {
          return json({ erro: "Erro ao buscar aparelhos: " + erroTokens.message }, 500);
        }

        const lista = Array.from(new Set((tokens ?? []).map((t) => t.token))).filter(Boolean);
        if (lista.length === 0) {
          return json({ enviados: 0, falhas: 0, total: 0 });
        }

        let enviados = 0;
        let falhas = 0;

        await Promise.all(
          lista.map(async (tokenPush) => {
            try {
              const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "X-Connection-Api-Key": FIREBASE_MESSAGING_API_KEY,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: {
                    token: tokenPush,
                    notification: { title: titulo, body: mensagem },
                    ...(caminho ? { data: { path: caminho } } : {}),
                  },
                }),
              });
              if (res.ok) {
                enviados++;
              } else {
                falhas++;
                console.error(`Falha no envio push [${res.status}]:`, await res.text().catch(() => ""));
              }
            } catch (e) {
              falhas++;
              console.error("Erro ao enviar push:", e);
            }
          })
        );

        return json({ enviados, falhas, total: lista.length });
      },
    },
  },
});
