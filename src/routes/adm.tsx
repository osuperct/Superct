import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp, CircleDollarSign, ShieldCheck, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import {
  cadastrarProfessor,
  definirAcesso,
  excluirProfessor,
  listarAcessos,
  type ContaAcesso,
} from "@/lib/adm.functions";
import { AppMidias } from "@/components/AppMidias";
import { ProdutosAdm } from "@/components/ProdutosAdm";
import { supabase } from "@/integrations/supabase/client";
import logoAdm from "@/assets/super-ct-logo-adm.jpg.asset.json";

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
            src={logoAdm.url}
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

      <Acessos />

      <AppMidias />

      <ProdutosAdm />

      <Cadastros />


    </Casca>
  );
}

/* ----------------------------- LIBERAÇÃO DE ACESSOS ----------------------------- */

function Acessos() {
  const listar = useServerFn(listarAcessos);
  const definir = useServerFn(definirAcesso);
  const cadastrar = useServerFn(cadastrarProfessor);
  const excluir = useServerFn(excluirProfessor);
  const [contas, setContas] = useState<ContaAcesso[] | null>(null);

  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", nascimento: "", email: "", cpf: "" });
  const [criando, setCriando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);

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
      toast.error("Não foi possível cadastrar o professor.");
    } finally {
      setCriando(false);
    }
  }


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
    if (!liberar) {
      const senha = window.prompt(`Digite a senha para remover o acesso de ${papel.toUpperCase()}:`);
      if (senha === null) return;
      if (senha.trim() !== "2802") {
        toast.error("Senha incorreta. Ação cancelada.");
        return;
      }
    }
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

  async function apagar(conta: ContaAcesso) {
    const nome = conta.nome || conta.email;
    if (!window.confirm(`Excluir definitivamente o cadastro de ${nome}?`)) return;
    const senha = window.prompt("Digite a senha de exclusão:");
    if (senha === null) return;
    if (senha.trim() !== "2802") {
      toast.error("Senha incorreta. Exclusão cancelada.");
      return;
    }
    setOcupado(`${conta.id}-excluir`);

    try {
      const r = await excluir({ data: { userId: conta.id } });
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
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <UserCheck className="size-4 text-primary" /> LIBERAR ACESSO DE PROFESSOR
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        O novo professor cria a conta normalmente na área do responsável. Depois, libere aqui o acesso dele
        para entrar na área do professor.
      </p>

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
    </section>
  );
}

/* ----------------------------- CADASTROS ----------------------------- */

function Cadastros() {
  const listar = useServerFn(listarAcessos);
  const excluir = useServerFn(excluirProfessor);
  const [contas, setContas] = useState<ContaAcesso[] | null>(null);
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setContas(await listar());
    } catch {
      setContas([]);
    }
  }, [listar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function apagar(conta: ContaAcesso) {
    const nome = conta.nome || conta.email;
    if (!window.confirm(`Excluir o cadastro de ${nome}? A pessoa precisará se cadastrar novamente.`)) return;
    const senha = window.prompt("Digite a senha para confirmar a exclusão:");
    if (senha === null) return;
    if (senha.trim() !== "2802") {
      toast.error("Senha incorreta. Exclusão cancelada.");
      return;
    }
    setOcupado(conta.id);
    try {
      const r = await excluir({ data: { userId: conta.id } });
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
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <Users className="size-4 text-primary" /> CADASTROS
        <span className="font-mono text-xs text-muted-foreground">({(contas ?? []).length})</span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Nomes e e-mails já cadastrados no aplicativo. Ao excluir, a pessoa pode fazer o cadastro novamente
        para acessar o login.
      </p>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou e-mail"
        className="mt-3 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {contas === null ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : filtradas.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nenhum cadastro encontrado.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtradas.map((c) => (
            <li key={c.id} className="rounded-md border border-border bg-background/60 p-3">
              <p className="font-display text-sm tracking-tight">{c.nome || "(sem nome)"}</p>
              <p className="break-all font-mono text-[11px] uppercase text-muted-foreground">{c.email}</p>
              <button
                type="button"
                disabled={ocupado === c.id}
                onClick={() => void apagar(c)}
                className="mt-2 flex items-center gap-2 rounded-md border border-border px-3 py-2 font-display text-[11px] tracking-tight disabled:opacity-60"
              >
                <Trash2 className="size-4" /> {ocupado === c.id ? "EXCLUINDO…" : "EXCLUIR CADASTRO"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
