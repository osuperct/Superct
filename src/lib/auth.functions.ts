import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const entrada = z.object({
  identificador: z.string().trim().min(3).max(255),
  senha: z.string().min(1).max(72),
});

/**
 * Entrada do responsável usando CPF **ou** e-mail.
 * O CPF é resolvido no servidor: o e-mail nunca é devolvido ao navegador
 * sem que a senha esteja correta.
 */
export const entrarComCpfOuEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entrada.parse(data))
  .handler(async ({ data }) => {
    const bruto = data.identificador;
    const digitos = bruto.replace(/\D/g, "");
    let email = bruto.includes("@") ? bruto.toLowerCase() : null;

    if (!email) {
      if (digitos.length !== 11) {
        return { ok: false as const, erro: "Informe um e-mail válido ou um CPF com 11 números." };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: perfil } = await supabaseAdmin
        .from("perfis")
        .select("id")
        .eq("cpf", digitos)
        .maybeSingle();
      if (!perfil) {
        return { ok: false as const, erro: "CPF ou senha incorretos." };
      }
      const { data: usuario } = await supabaseAdmin.auth.admin.getUserById(perfil.id);
      email = usuario.user?.email ?? null;
      if (!email) {
        return { ok: false as const, erro: "CPF ou senha incorretos." };
      }
    }

    const publico = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: sessao, error } = await publico.auth.signInWithPassword({
      email,
      password: data.senha,
    });
    if (error || !sessao.session) {
      return { ok: false as const, erro: "CPF/e-mail ou senha incorretos." };
    }

    return {
      ok: true as const,
      access_token: sessao.session.access_token,
      refresh_token: sessao.session.refresh_token,
    };
  });
