import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export const enviarRecadoPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { titulo: string; mensagem: string; caminho?: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: ehProfessor } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "professor" as "professor" | "responsavel" | "adm",
    });
    if (!ehProfessor) {
      throw new Error("Apenas professor pode enviar recados por push.");
    }

    const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
    const FIREBASE_MESSAGING_API_KEY = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!LOVABLE_API_KEY || !FIREBASE_MESSAGING_API_KEY) {
      throw new Error("Configuração de notificações incompleta.");
    }

    const mesRef = new Date();
    const refStr = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}-01`;

    const { data: mensalidadesAtivas, error: errMens } = await context.supabase
      .from("mensalidades")
      .select("user_id")
      .eq("referencia", refStr)
      .eq("ativo", true);

    if (errMens) {
      throw new Error("Erro ao buscar mensalidades: " + errMens.message);
    }

    const userIds = Array.from(new Set((mensalidadesAtivas ?? []).map((m) => m.user_id)));
    if (userIds.length === 0) {
      return { enviados: 0, falhas: 0, total: 0 };
    }

    const { data: tokens, error } = await context.supabase
      .from("tokens_push")
      .select("token")
      .in("user_id", userIds);

    if (error) {
      throw new Error("Erro ao buscar tokens: " + error.message);
    }

    const vistos = new Set<string>();
    const lista: string[] = [];
    for (const row of tokens ?? []) {
      if (!vistos.has(row.token)) {
        vistos.add(row.token);
        lista.push(row.token);
      }
    }

    if (lista.length === 0) {
      return { enviados: 0, falhas: 0, total: 0 };
    }

    let enviados = 0;
    let falhas = 0;

    await Promise.all(
      lista.map(async (token) => {
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
                token,
                notification: { title: data.titulo, body: data.mensagem },
                data: data.caminho ? { path: data.caminho } : undefined,
              },
            }),
          });
          if (res.ok) {
            enviados++;
          } else {
            falhas++;
            const text = await res.text().catch(() => "");
            // eslint-disable-next-line no-console
            console.error(`Falha no envio push [${res.status}]:`, text);
          }
        } catch (e) {
          falhas++;
          // eslint-disable-next-line no-console
          console.error("Erro ao enviar push:", e);
        }
      })
    );

    return { enviados, falhas, total: lista.length };
  });
