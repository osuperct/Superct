import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const entrada = z.object({
  tipo: z.string().min(1).max(40),
  nomeAssinante: z.string().max(200),
  hashDocumento: z.string().regex(/^[a-f0-9]{64}$/),
  caminho: z.string().max(500),
  biometria: z.boolean(),
  biometriaCredencial: z.string().max(2000).nullable(),
});

/**
 * Registra a trilha de auditoria da assinatura eletrônica (Lei 14.063/2020).
 * Valida o login pelo token do próprio pedido e usa a chave pública como reserva,
 * para funcionar também em hospedagens sem as variáveis de servidor configuradas.
 */
export const registrarAssinatura = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => entrada.parse(d))
  .handler(async ({ data }) => {
    const req = getRequest();
    const h = req.headers;
    const url = process.env["SUPABASE_URL"] || import.meta.env['VITE_SUPABASE_URL'];
    const chave = process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
    const token = (h.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!url || !chave || !token) {
      return { ok: false as const, erro: "Sua sessão expirou. Saia e entre de novo na conta." };
    }

    const supabase = createClient<Database>(url, chave, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: u, error: erroUser } = await supabase.auth.getUser(token);
    if (erroUser || !u.user) {
      return { ok: false as const, erro: "Sua sessão expirou. Saia e entre de novo na conta." };
    }

    const ip =
      h.get("cf-connecting-ip") ||
      h.get("x-real-ip") ||
      (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      "não identificado";
    const userAgent = (h.get("user-agent") ?? "").slice(0, 500);
    const email = u.user.email ?? null;
    const ultimoLogin = u.user.last_sign_in_at ?? null;

    const { data: linha, error } = await supabase
      .from("assinaturas_eletronicas")
      .insert({
        user_id: u.user.id,
        tipo: data.tipo,
        email,
        nome_assinante: data.nomeAssinante,
        ip,
        user_agent: userAgent,
        login_verificado: true,
        ultimo_login: ultimoLogin,
        biometria: data.biometria,
        biometria_credencial: data.biometriaCredencial,
        hash_documento: data.hashDocumento,
        caminho: data.caminho,
      })
      .select("id, assinado_em")
      .single();
    if (error || !linha) {
      console.error("registrarAssinatura", error);
      return { ok: false as const, erro: "Não foi possível registrar a assinatura." };
    }
    return {
      ok: true as const,
      id: linha.id,
      assinadoEm: linha.assinado_em,
      ip,
      email,
      userAgent,
      ultimoLogin,
    };
  });
