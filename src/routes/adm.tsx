import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleDollarSign, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adm")({
  head: () => ({
    meta: [
      { title: "Área ADM — Super CT" },
      {
        name: "description",
        content: "Acesso administrativo do Super CT: matrículas ativas, mensalidades e projeção financeira.",
      },
      { property: "og:title", content: "Área ADM — Super CT" },
      {
        property: "og:description",
        content: "Login administrativo do Super CT para matrículas e mensalidades.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <Casca>
      <p className="text-sm text-muted-foreground">Não foi possível abrir a área ADM.</p>
    </Casca>
  ),
  component: AdmPage,
});

function Casca({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-sm px-5 py-8">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Início
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl leading-tight tracking-tighter">
          <ShieldCheck className="size-6 shrink-0 text-primary" />
          <span>
            ÁREA <span className="text-primary">ADM</span>
          </span>
        </h1>
        <div className="mt-6 space-y-6">{children}</div>
      </main>
    </div>
  );
}

function AdmPage() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const verificar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao.user) {
      setAutorizado(false);
      return;
    }
    const { data } = await supabase.from("user_roles").select("role");
    setAutorizado((data ?? []).some((p) => p.role === "professor"));
  }, []);

  useEffect(() => {
    void verificar();
  }, [verificar]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setOcupado(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    await verificar();
  }

  if (autorizado === null)
    return (
      <Casca>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Casca>
    );

  if (!autorizado)
    return (
      <Casca>
        <p className="text-sm text-muted-foreground">
          Acesso restrito à administração. Informe o e-mail e a senha da conta ADM.
        </p>
        <form onSubmit={(e) => void entrar(e)} className="space-y-3">
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              E-mail
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Senha
            </span>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={ocupado}
            className="w-full rounded-md bg-primary px-4 py-3 font-display tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {ocupado ? "AGUARDE…" : "ENTRAR NA ÁREA ADM"}
          </button>
        </form>
      </Casca>
    );

  return (
    <Casca>
      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <CircleDollarSign className="size-4 text-primary" /> MATRÍCULAS ATIVAS OU INATIVAS
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Situação de cada matrícula no mês, recebimento das mensalidades e projeção do próximo mês.
        </p>
        <Link
          to="/financeiro"
          className="mt-3 inline-block rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground"
        >
          ABRIR MATRÍCULAS E MENSALIDADES
        </Link>
      </section>
    </Casca>
  );
}
