import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, ChevronDown, ChevronUp, CircleDollarSign, ShieldCheck, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { cadastrarProfessor } from "@/lib/adm.functions";
import { definirAcessoConta, definirAprovacaoConta, excluirConta, listarAcessosContas, type ContaAcesso } from "@/lib/adm";
import { AppMidias } from "@/components/AppMidias";
import { ProdutosAdm } from "@/components/ProdutosAdm";
import { supabase } from "@/integrations/supabase/client";
import logoAdm from "@/assets/super-ct-logo-adm.jpg.asset.json";
import { assetUrl } from "@/lib/assetUrl";

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
        <h1 className="mt-3 flex items-center gap-3 font-display text-2xl leading-tight tracking-tighter">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-6 shrink-0 text-primary" />
            <span>
              ÁREA <span className="text-primary">ADM</span>
            </span>
          </span>
          <img
            src={assetUrl(logoAdm)}
            alt="Super CT"
            className="h-10 w-auto rounded-md object-contain"
          />
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
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", sessao.user.id);
    setAutorizado((data ?? []).some((p) => p.role === "adm"));
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

      <Aprovacoes />

      <Acessos />

      <AppMidias />

      <ProdutosAdm />


    </Casca>
  );
}

/* ----------------------------- APROVAÇÃO DE CADASTROS ----------------------------- */

function Aprovacoes() {
  const [contas, setContas] = useState<ContaAcesso[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setContas(await listarAcessosContas());
    } catch {
      setContas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternar(conta: ContaAcesso, aprovar: boolean) {
    let pin = "";
    if (!aprovar) {
      const senha = window.prompt("Digite a senha para bloquear este cadastro:");
      if (senha === null) return;
      pin = senha;
    }
    setOcupado(conta.id);
    const r = await definirAprovacaoConta(conta.id, aprovar, pin);
    setOcupado(null);
    if (!r.ok) {
      toast.error(r.erro);
      return;
    }
    toast.success(aprovar ? "Cadastro aprovado!" : "Cadastro bloqueado.");
    await carregar();
  }

  const pendentes = (contas ?? []).filter((c) => !c.aprovado);
  const lista = verTodas ? (contas ?? []) : pendentes;

  return (
    <section className="rounded-lg border border-primary/40 bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <BadgeCheck className="size-4 text-primary" /> APROVAR NOVOS CADASTROS
        {pendentes.length > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">
            {pendentes.length}
          </span>
        )}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        O responsável se cadastra no site e só entra na área dele depois que você confirmar o WhatsApp e aprovar
        aqui.
      </p>

      {contas === null ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {lista.map((c) => {
            const zap = c.telefone.replace(/\D/g, "");
            return (
              <li
                key={c.id}
                className={`rounded-md border bg-background/60 p-3 ${
                  c.aprovado ? "border-border" : "animate-pulse-slow border-primary/60"
                }`}
              >
                <p className="font-display text-sm tracking-tight">{c.nome || "(sem nome)"}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{c.email}</p>
                {c.telefone && <p className="mt-0.5 text-xs text-muted-foreground">WhatsApp: {c.telefone}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {zap.length >= 10 && (
                    <a
                      href={`https://wa.me/55${zap.slice(-11)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-border px-3 py-1.5 font-display text-[11px] tracking-tight text-muted-foreground"
                    >
                      CONFIRMAR NO WHATSAPP
                    </a>
                  )}
                  {c.aprovado ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary/20 px-3 py-1.5 font-display text-[11px] tracking-tight text-secondary">
                        <BadgeCheck className="size-3.5" />
                        APROVADO
                      </span>
                      <button
                        type="button"
                        disabled={ocupado === c.id}
                        onClick={() => void alternar(c, false)}
                        className="rounded-md border border-border px-3 py-1.5 font-display text-[11px] tracking-tight text-muted-foreground disabled:opacity-60 hover:border-primary hover:text-primary"
                      >
                        BLOQUEAR
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={ocupado === c.id}
                      onClick={() => void alternar(c, true)}
                      className="rounded-md bg-primary px-3 py-1.5 font-display text-[11px] tracking-tight text-primary-foreground disabled:opacity-60"
                    >
                      APROVAR CADASTRO
                    </button>
                  )}
                </div>
              </li>
            );
          })}
          {lista.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhum cadastro aguardando aprovação.</li>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setVerTodas((v) => !v)}
        aria-label={verTodas ? "Mostrar só pendentes" : "Mostrar todos os cadastros"}
        className="mt-3 inline-flex items-center justify-center rounded-md border border-border bg-background/60 p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        {verTodas ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
    </section>
  );
}

/* ----------------------------- LIBERAÇÃO DE ACESSOS ----------------------------- */

function Acessos() {
  const cadastrar = useServerFn(cadastrarProfessor);
  const [contas, setContas] = useState<ContaAcesso[] | null>(null);

  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", nascimento: "", email: "", cpf: "" });
  const [criando, setCriando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);
  const [aberto, setAberto] = useState(false);

  async function criarProfessor(e: React.FormEvent) {
    e.preventDefault();
    const cpf = form.cpf.replace(/\D/g, "");
    if (form.nome.trim().length < 3) {
      toast.error("Informe o nome completo.");
      return;
    }
    if (!form.nascimento) {
      toast.error("Informe a data de nascimento.");
      return;
    }
    if (cpf.length !== 11) {
      toast.error("CPF deve ter 11 dígitos.");
      return;
    }
    setCriando(true);
    try {
      const r = await cadastrar({
        data: { nome: form.nome.trim(), nascimento: form.nascimento, email: form.email.trim(), cpf },
      });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Professor cadastrado e acesso liberado.");
      setSenhaGerada({ email: form.email.trim().toLowerCase(), senha: r.senhaTemporaria });
      setForm({ nome: "", nascimento: "", email: "", cpf: "" });
      setNovo(false);
      await carregar();
    } catch {
      toast.error(
        "Não foi possível cadastrar o professor por aqui. Peça para ele criar a conta na área do responsável e depois libere o acesso na lista abaixo.",
      );
    } finally {
      setCriando(false);
    }
  }


  const carregar = useCallback(async () => {
    try {
      setContas(await listarAcessosContas());
    } catch {
      toast.error("Não foi possível carregar as contas.");
      setContas([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alternar(conta: ContaAcesso, papel: "professor" | "adm", liberar: boolean) {
    let pin = "";
    if (!liberar) {
      const senha = window.prompt(`Digite a senha para remover o acesso de ${papel.toUpperCase()}:`);
      if (senha === null) return;
      pin = senha;
    }
    setOcupado(`${conta.id}-${papel}`);
    const r = await definirAcessoConta(conta.id, papel, liberar, pin);
    setOcupado(null);
    if (!r.ok) {
      toast.error(r.erro);
      return;
    }
    toast.success(liberar ? "Acesso liberado." : "Acesso removido.");
    await carregar();
  }

  async function apagar(conta: ContaAcesso) {
    const nome = conta.nome || conta.email;
    if (!window.confirm(`Excluir definitivamente o cadastro de ${nome}?`)) return;
    const senha = window.prompt("Digite a senha de exclusão:");
    if (senha === null) return;
    setOcupado(`${conta.id}-excluir`);

    try {
      const r = await excluirConta(conta.id, senha);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Cadastro excluído.");
      await carregar();
    } catch {
      toast.error("Não foi possível excluir o cadastro.");
    } finally {
      setOcupado(null);
    }
  }



  const filtradas = (contas ?? []).filter((c) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return c.nome.toLowerCase().includes(t) || c.email.toLowerCase().includes(t);
  });

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={aberto}
      >
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <UserCheck className="size-4 text-primary" /> LIBERAR ACESSO DE PROFESSOR
        </h2>
        {aberto ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-primary" />}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        O novo professor cria a conta normalmente na área do responsável. Depois, libere aqui o acesso dele
        para entrar na área do professor.
      </p>

      {aberto && (
        <>
          <button
            type="button"
            onClick={() => setNovo((v) => !v)}
            className="mt-3 flex items-center gap-2 rounded-md bg-primary px-3 py-2 font-display text-[11px] tracking-tight text-primary-foreground"
          >
            <UserPlus className="size-4" /> {novo ? "FECHAR CADASTRO" : "CADASTRAR NOVO PROFESSOR"}
          </button>

      {novo && (
        <form onSubmit={(e) => void criarProfessor(e)} className="mt-3 space-y-2 rounded-md border border-border bg-background/60 p-3">
          {[
            { k: "nome", rotulo: "Nome completo", tipo: "text" },
            { k: "nascimento", rotulo: "Data de nascimento", tipo: "date" },
            { k: "email", rotulo: "E-mail", tipo: "email" },
            { k: "cpf", rotulo: "CPF", tipo: "text" },
          ].map((c) => (
            <label key={c.k} className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {c.rotulo}
              </span>
              <input
                type={c.tipo}
                required
                value={form[c.k as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [c.k]: e.target.value }))}
                className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={criando}
            className="w-full rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {criando ? "CADASTRANDO…" : "CADASTRAR E LIBERAR PROFESSOR"}
          </button>
        </form>
      )}

      {senhaGerada && (
        <div className="mt-3 rounded-md border border-primary/60 bg-primary/10 p-3 text-xs">
          <p className="font-display tracking-tight">ACESSO CRIADO</p>
          <p className="mt-1 text-muted-foreground">
            Entregue estes dados ao professor: e-mail <span className="text-primary">{senhaGerada.email}</span> e
            senha provisória <span className="text-primary">{senhaGerada.senha}</span>. Ele já pode entrar na
            área do professor e trocar a senha depois.
          </p>
        </div>
      )}

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
                <button
                  type="button"
                  disabled={ocupado === `${c.id}-excluir`}
                  onClick={() => void apagar(c)}
                  className="flex items-center gap-1 rounded-md border border-destructive/60 px-3 py-1.5 font-display text-[11px] tracking-tight text-destructive disabled:opacity-60"
                >
                  <Trash2 className="size-3.5" /> EXCLUIR CADASTRO
                </button>
              </div>
            </li>
          ))}
          {filtradas.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhuma conta encontrada.</li>
          )}
        </ul>
      )}
        </>
      )}
    </section>
  );
}

