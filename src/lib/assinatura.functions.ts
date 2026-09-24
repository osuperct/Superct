import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrada = z.object({
  tipo: z.string().min(1).max(40),
  nomeAssinante: z.string().max(200),
  hashDocumento: z.string().regex(/^[a-f0-9]{64}$/),
  caminho: z.string().max(500),
  biometria: z.boolean(),
  biometriaCredencial: z.string().max(500).nullable(),
});

/** Registra a trilha de auditoria da assinatura eletrônica (Lei 14.063/2020). */
export const registrarAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => entrada.parse(d))
  .handler(async ({ data, context }) => {
    const req = getRequest();
    const h = req.headers;
    const ip =
      h.get("cf-connecting-ip") ||
      h.get("x-real-ip") ||
      (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      "não identificado";
    const userAgent = (h.get("user-agent") ?? "").slice(0, 500);
    const { data: u } = await context.supabase.auth.getUser();
    const email = u.user?.email ?? null;
    const ultimoLogin = u.user?.last_sign_in_at ?? null;

    const { data: linha, error } = await context.supabase
      .from("assinaturas_eletronicas")
      .insert({
        user_id: context.userId,
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
    if (error || !linha) return { ok: false as const, erro: "Não foi possível registrar a assinatura." };
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
