import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContaAcesso = {
  id: string;
  email: string;
  nome: string;
  professor: boolean;
  adm: boolean;
};

async function garantirAdm(supabase: {
  rpc: (fn: "has_role", args: { _user_id: string; _role: "adm" }) => Promise<{ data: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "adm" });
  if (data !== true) throw new Error("Acesso restrito à administração.");
}

/** Lista as contas cadastradas com os acessos de cada uma (somente ADM). */
export const listarAcessos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContaAcesso[]> => {
    await garantirAdm(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: lista, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error("Não foi possível carregar as contas.");

    const { data: papeis } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: perfis } = await supabaseAdmin.from("perfis").select("id, nome_responsavel");

    return lista.users
      .map((u) => {
        const meus = (papeis ?? []).filter((p) => p.user_id === u.id);
        return {
          id: u.id,
          email: u.email ?? "",
          nome: (perfis ?? []).find((p) => p.id === u.id)?.nome_responsavel ?? "",
          professor: meus.some((p) => p.role === "professor"),
          adm: meus.some((p) => p.role === "adm"),
        };
      })
      .sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email, "pt-BR"));
  });

const entradaPapel = z.object({
  userId: z.string().uuid(),
  papel: z.enum(["professor", "adm"]),
  liberar: z.boolean(),
});

/** Libera ou remove o acesso de professor / ADM de uma conta (somente ADM). */
export const definirAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entradaPapel.parse(data))
  .handler(async ({ data, context }) => {
    await garantirAdm(context.supabase as never, context.userId);
    if (!data.liberar && data.userId === context.userId && data.papel === "adm") {
      return { ok: false as const, erro: "Você não pode remover o seu próprio acesso ADM." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.liberar) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.papel }, { onConflict: "user_id,role" });
      if (error) return { ok: false as const, erro: "Não foi possível liberar o acesso." };
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.papel);
      if (error) return { ok: false as const, erro: "Não foi possível remover o acesso." };
    }
    return { ok: true as const };
  });

const entradaProfessor = z.object({
  nome: z.string().trim().min(3).max(120),
  nascimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.string().trim().email().max(255),
  cpf: z.string().trim().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 11, {
    message: "CPF inválido",
  }),
});

/** Cria a conta de um novo professor e já libera o acesso dele (somente ADM). */
export const cadastrarProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entradaProfessor.parse(data))
  .handler(async ({ data, context }) => {
    await garantirAdm(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const senhaTemporaria = `SCT-${data.cpf.slice(0, 6)}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome_responsavel: data.nome, cpf: data.cpf },
    });
    if (error || !criado.user) {
      const msg = (error?.message ?? "").toLowerCase();
      let erro = "Não foi possível criar a conta.";
      if (msg.includes("already") || msg.includes("registered")) erro = "Já existe uma conta com este e-mail.";
      else if (msg.includes("perfis_cpf") || msg.includes("cpf"))
        erro = "Este CPF já está cadastrado em outra conta. Use o CPF do novo professor.";
      else if (msg.includes("password")) erro = "Senha inválida, tente novamente.";
      else if (error?.message) erro = `Não foi possível criar a conta: ${error.message}`;
      return { ok: false as const, erro };
    }

    await supabaseAdmin
      .from("perfis")
      .upsert(
        { id: criado.user.id, nome_responsavel: data.nome, cpf: data.cpf, nascimento: data.nascimento },
        { onConflict: "id" },
      );

    const { error: erroPapel } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: criado.user.id, role: "professor" }, { onConflict: "user_id,role" });
    if (erroPapel) return { ok: false as const, erro: "Conta criada, mas não foi possível liberar o acesso." };

    return { ok: true as const, senhaTemporaria };
  });
