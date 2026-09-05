import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CircleDollarSign, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { definirAcesso, listarAcessos, type ContaAcesso } from "@/lib/adm.functions";
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

      <Acessos />
    </Casca>
  );
}

/* ----------------------------- LIBERAÇÃO DE ACESSOS ----------------------------- */

function Acessos() {
  const listar = useServerFn(listarAcessos);
  const definir = useServerFn(definirAcesso);
  const [contas, setContas] = useState<ContaAcesso[] | null>(null);
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setContas(await listar());
    } catch {
      toast.error("Não foi possível carregar as contas.");
      setContas([]);
    }
  }, [listar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternar(conta: ContaAcesso, papel: "professor" | "adm", liberar: boolean) {
    setOcupado(`${conta.id}-${papel}`);
    const r = await definir({ data: { userId: conta.id, papel, liberar } });
    setOcupado(null);
    if (!r.ok) {
      toast.error(r.erro);
      return;
    }
    toast.success(liberar ? "Acesso liberado." : "Acesso removido.");
    await carregar();
  }

  const filtradas = (contas ?? []).filter((c) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return c.nome.toLowerCase().includes(t) || c.email.toLowerCase().includes(t);
  });

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <UserCheck className="size-4 text-primary" /> LIBERAR ACESSO DE PROFESSOR
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        O novo professor cria a conta normalmente na área do responsável. Depois, libere aqui o acesso dele
        para entrar na área do professor.
      </p>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou e-mail"
        className="mt-3 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {contas === null ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando contas…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtradas.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-background/60 p-3">
              <p className="font-display text-sm tracking-tight">{c.nome || "(sem nome)"}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{c.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={ocupado === `${c.id}-professor`}
                  onClick={() => void alternar(c, "professor", !c.professor)}
                  className={`rounded-md px-3 py-1.5 font-display text-[11px] tracking-tight disabled:opacity-60 ${
                    c.professor
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {c.professor ? "PROFESSOR LIBERADO" : "LIBERAR PROFESSOR"}
                </button>
                <button
                  type="button"
                  disabled={ocupado === `${c.id}-adm`}
                  onClick={() => void alternar(c, "adm", !c.adm)}
                  className={`rounded-md px-3 py-1.5 font-display text-[11px] tracking-tight disabled:opacity-60 ${
                    c.adm ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                  }`}
                >
                  {c.adm ? "ADM LIBERADO" : "LIBERAR ADM"}
                </button>
              </div>
            </li>
          ))}
          {filtradas.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhuma conta encontrada.</li>
          )}
        </ul>
      )}
    </section>
  );
}
