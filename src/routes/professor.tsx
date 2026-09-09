import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { ChevronDown, FileText, GraduationCap, Paperclip, ShieldCheck, Trash2, Upload, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AvaliacaoProfessor } from "@/components/AvaliacaoProfessor";
import { AvisosProfessor } from "@/components/AvisosProfessor";
import { EnvioPush } from "@/components/EnvioPush";
import { ListaChamada } from "@/components/ListaChamada";

import { criarAlunoProfessor } from "@/lib/adm";
import { formatarCpf } from "@/lib/cpf";
import { type Mensalidade, refMes } from "@/lib/mensalidade";

export const Route = createFileRoute("/professor")({
  head: () => ({
    meta: [
      { title: "Área do Professor — Super CT" },
      {
        name: "description",
        content:
          "Painel do Professor Tio Victor: alunos matriculados e contratos assinados do Super CT.",
      },
      { property: "og:title", content: "Área do Professor — Super CT" },
      {
        property: "og:description",
        content: "Alunos matriculados e contratos assinados do Super CT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => <Aviso texto="Não foi possível abrir a área do professor." />,
  component: ProfessorPage,
});

const BUCKET = "documentos-alunos";

type Doc = {
  id: string;
  tipo: string;
  nome_arquivo: string;
  caminho: string;
  created_at: string;
  user_id: string;
  aluno_id: string | null;
  enviado_por_professor: boolean;
  liberado: boolean;
};
type Alu = {
  id: string;
  nome: string;
  idade: number | null;
  matricula: string | null;
  user_id: string;
  created_at: string;
};
type Perfil = { id: string; nome_responsavel: string; telefone: string | null; cpf: string | null };

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-sm px-5 py-12">
        <p className="text-sm text-muted-foreground">{texto}</p>
        <Link to="/" className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-primary">
          ← Início
        </Link>
      </main>
    </div>
  );
}

function ProfessorPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-5 py-8">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Início
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl leading-tight tracking-tighter">
          <GraduationCap className="size-6 shrink-0 text-primary" />
          <span>
            ÁREA DO <span className="text-primary">PROFESSOR</span>
          </span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Lista de alunos matriculados e cópia dos contratos assinados.
        </p>

        {carregando ? (
          <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>
        ) : session ? (
          <Painel professorId={session.user.id} />
        ) : (
          <div className="mt-8">
            <p className="text-sm text-muted-foreground">Entre com a conta do Super CT para ver este painel.</p>
            <Link
              to="/conta"
              className="mt-3 inline-block rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground"
            >
              FAZER LOGIN
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Painel({ professorId }: { professorId: string }) {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [ehAdm, setEhAdm] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [alunos, setAlunos] = useState<Alu[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [filtroAlunos, setFiltroAlunos] = useState<"recentes" | "todos" | "ativos" | "inativos">("todos");
  const [alunoSel, setAlunoSel] = useState("");
  const [tipoSel, setTipoSel] = useState("contrato");
  const [enviando, setEnviando] = useState(false);
  const [verDocs, setVerDocs] = useState(false);
  const [docsAberto, setDocsAberto] = useState("");
  const [alunosMinimizado, setAlunosMinimizado] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoAluno, setNovoAluno] = useState({ userId: "", nome: "", nascimento: "", fisico: true });
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [criandoAluno, setCriandoAluno] = useState(false);

  const inputArquivo = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const { data: sessaoAtual } = await supabase.auth.getUser();
    const uidAtual = sessaoAtual.user?.id ?? "";
    const { data: papeis } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uidAtual);
    const ehProfessor = (papeis ?? []).some((p) => p.role === "professor");
    setAutorizado(ehProfessor);
    setEhAdm((papeis ?? []).some((p) => p.role === "adm"));
    if (!ehProfessor) return;

    // Liga contratos assinados que ficaram sem aluno cadastrado.
    await supabase.rpc("vincular_alunos_dos_contratos");

    const [{ data: d }, { data: a }, { data: p }, { data: m }] = await Promise.all([
      supabase
        .from("documentos")
        .select("id, tipo, nome_arquivo, caminho, created_at, user_id, aluno_id, enviado_por_professor, liberado")
        .order("created_at", { ascending: false }),
      supabase.from("alunos").select("id, nome, idade, matricula, user_id, created_at").order("matricula"),
      supabase.from("perfis").select("id, nome_responsavel, telefone, cpf"),
      supabase
        .from("mensalidades")
        .select("id, aluno_id, user_id, referencia, ativo, valor, pago, pago_em, forma"),
    ]);
    setDocs((d ?? []) as Doc[]);
    setAlunos((a ?? []) as Alu[]);
    setPerfis((p ?? []) as Perfil[]);
    setMensalidades((m ?? []) as Mensalidade[]);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function abrir(doc: Doc) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.caminho, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Não foi possível abrir o arquivo.");
  }

  async function excluir(doc: Doc) {
    if (!window.confirm(`Excluir definitivamente "${doc.nome_arquivo}"?`)) return;
    const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
    if (error) {
      toast.error("Não foi possível excluir o documento.");
      return;
    }
    await supabase.storage.from(BUCKET).remove([doc.caminho]);
    toast.success("Documento excluído.");
    void carregar();
  }

  async function liberar(doc: Doc, liberado: boolean) {
    const { error } = await supabase
      .from("documentos")
      .update({ liberado, liberado_em: liberado ? new Date().toISOString() : null })
      .eq("id", doc.id);
    if (error) {
      toast.error("Não foi possível atualizar a liberação.");
      return;
    }
    if (liberado) {
      // Garante que o aluno do contrato conferido já exista e entre na lista de chamada.
      await supabase.rpc("vincular_alunos_dos_contratos");
    }
    toast.success(
      liberado
        ? "Documento liberado. Aluno incluído na lista de chamada."
        : "Liberação cancelada.",
    );
    void carregar();
  }


  async function anexar(arquivo: File) {
    const alu = alunos.find((a) => a.id === alunoSel);
    if (!alu) {
      toast.error("Escolha o aluno do documento.");
      return;
    }
    if (arquivo.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 20 MB).");
      return;
    }
    setEnviando(true);
    const limpo = arquivo.name.replace(/[^\w.\-]+/g, "_");
    const caminho = `${alu.user_id}/${Date.now()}-${limpo}`;
    const { error: erroUp } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
    if (erroUp) {
      setEnviando(false);
      toast.error("Falha ao enviar o arquivo.");
      return;
    }
    const { error } = await supabase.from("documentos").insert({
      user_id: alu.user_id,
      aluno_id: alu.id,
      tipo: tipoSel,
      nome_arquivo: arquivo.name,
      caminho,
      enviado_por_professor: true,
      liberado: true,
      liberado_em: new Date().toISOString(),
    });
    setEnviando(false);
    if (inputArquivo.current) inputArquivo.current.value = "";
    if (error) {
      toast.error("Não foi possível registrar o documento.");
      return;
    }
    toast.success(`Documento anexado ao cadastro de ${alu.nome}.`);
    void carregar();
  }

  async function salvarNovoAluno(e: React.FormEvent) {
    e.preventDefault();
    if (!novoAluno.userId) {
      toast.error("Escolha o responsável do aluno.");
      return;
    }
    if (novoAluno.nome.trim().length < 2) {
      toast.error("Informe o nome do aluno.");
      return;
    }
    setCriandoAluno(true);
    const r = await criarAlunoProfessor({
      userId: novoAluno.userId,
      nome: novoAluno.nome.trim(),
      ...(novoAluno.nascimento ? { nascimento: novoAluno.nascimento } : {}),
      documentosFisicos: novoAluno.fisico,
    });
    if (!r.ok) {
      setCriandoAluno(false);
      toast.error(r.erro);
      return;
    }

    if (novoArquivo) {
      const limpo = novoArquivo.name.replace(/[^\w.\-]+/g, "_");
      const caminho = `${novoAluno.userId}/${Date.now()}-${limpo}`;
      const { error: erroUp } = await supabase.storage.from(BUCKET).upload(caminho, novoArquivo);
      if (erroUp) {
        setCriandoAluno(false);
        toast.error("Aluno cadastrado, mas o arquivo não foi enviado. Tente anexar novamente.");
        void carregar();
        return;
      }
      await supabase.from("documentos").insert({
        user_id: novoAluno.userId,
        aluno_id: r.aluno_id,
        tipo: "contrato",
        nome_arquivo: novoArquivo.name,
        caminho,
        enviado_por_professor: true,
        liberado: true,
        liberado_em: new Date().toISOString(),
      });
    }

    setCriandoAluno(false);
    setNovoAluno({ userId: "", nome: "", nascimento: "", fisico: true });
    setNovoArquivo(null);
    setNovoAberto(false);
    toast.success("Aluno cadastrado e incluído na lista de chamada.");
    void carregar();
  }

  const docsDoAluno = (alu: Alu): Doc[] =>
    docs.filter((d) => d.liberado && (d.aluno_id ? d.aluno_id === alu.id : d.user_id === alu.user_id));

  const mesRef = refMes();

  const estaAtivo = (alunoId: string) =>
    mensalidades.find((m) => m.aluno_id === alunoId && m.referencia === mesRef)?.ativo ?? true;
  const limite = Date.now() - 15 * 24 * 60 * 60 * 1000;
  const porNome = [...alunos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const alunosFiltrados: Alu[] =
    filtroAlunos === "recentes"
      ? [...alunos]
          .filter((a) => new Date(a.created_at).getTime() >= limite)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
      : filtroAlunos === "ativos"
        ? porNome.filter((a) => estaAtivo(a.id))
        : filtroAlunos === "inativos"
          ? porNome.filter((a) => !estaAtivo(a.id))
          : porNome;

  if (autorizado === null) return <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>;
  if (!autorizado)
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        Esta área é exclusiva do professor. Entre com a conta do Super CT (osuper.c.t@gmail.com) para acessar.
      </p>
    );

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-lg border border-primary/50 bg-primary/5 p-4">
        <h2 className="font-display text-lg tracking-tight text-primary">PROFESSOR</h2>
        <p className="mt-2 text-sm font-medium">Victor Hugo Jorge de Siqueira</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          CREF 057790-G/MG
        </p>
        {ehAdm ? (
          <Link
            to="/adm"
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground active:scale-95"
          >
            <ShieldCheck className="size-4" /> ÁREA ADM
          </Link>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <button
          type="button"
          onClick={() => setAlunosMinimizado((v) => !v)}
          className="flex w-full items-center justify-between gap-2"
        >
          <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
            <Users className="size-4 text-primary" /> ALUNOS MATRICULADOS ({alunos.length})
          </h2>
          <ChevronDown
            className={`size-5 shrink-0 text-primary transition-transform ${alunosMinimizado ? "" : "rotate-180"}`}
          />
        </button>

        {!alunosMinimizado && (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <select
                value={filtroAlunos}
                onChange={(e) => setFiltroAlunos(e.target.value as typeof filtroAlunos)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <option value="recentes">Mais recentes (15 dias)</option>
                <option value="todos">Todos (A–Z)</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
              </select>
            </div>

            <ul className="mt-3 space-y-2">
              {alunosFiltrados.map((a) => {
                const perfil = perfis.find((p) => p.id === a.user_id);
                const ativo = estaAtivo(a.id);
                return (
                  <li key={a.id} className="rounded-md border border-border bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {a.nome}
                        {a.idade ? ` — ${a.idade} anos` : ""}
                      </p>
                      <span className="shrink-0 rounded border border-primary/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                        {a.matricula ?? "sem matrícula"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Responsável: {perfil?.nome_responsavel || "—"}
                      {perfil?.telefone ? ` • ${perfil.telefone}` : ""}
                      {perfil?.cpf ? ` • CPF ${formatarCpf(perfil.cpf)}` : ""}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p
                        className={`font-mono text-[9px] uppercase tracking-widest ${
                          ativo ? "text-primary" : "text-destructive"
                        }`}
                      >
                        Matrícula {ativo ? "ativa" : "inativa"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDocsAberto((s) => (s === a.id ? "" : a.id))}
                        className="flex shrink-0 items-center gap-1 rounded border border-primary/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary active:scale-95"
                      >
                        DOC ({docsDoAluno(a).length})
                        <ChevronDown
                          className={`size-3 transition-transform ${docsAberto === a.id ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {docsAberto === a.id ? (
                      <ul className="mt-2 space-y-1 border-t border-border pt-2">
                        {docsDoAluno(a).map((d) => (
                          <li key={d.id}>
                            <button
                              type="button"
                              onClick={() => void abrir(d)}
                              className="flex w-full items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5 text-left text-xs active:scale-[0.99]"
                            >
                              <FileText className="size-3.5 shrink-0 text-primary" />
                              <span className="min-w-0 flex-1 truncate">
                                {d.tipo} • {d.nome_arquivo}
                              </span>
                              <span className="shrink-0 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                                {new Date(d.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </button>
                          </li>
                        ))}
                        {docsDoAluno(a).length === 0 && (
                          <li className="text-xs text-muted-foreground">
                            Nenhum documento conferido e liberado para este aluno.
                          </li>
                        )}
                      </ul>
                    ) : null}
                  </li>
                );
              })}

              {alunosFiltrados.length === 0 && (
                <li className="text-sm text-muted-foreground">Nenhum aluno nesta seleção.</li>
              )}
            </ul>
          </>
        )}
      </section>


      <ListaChamada alunos={porNome.filter((a) => estaAtivo(a.id))} professorId={professorId} />

      <AvisosProfessor uid={professorId} />

      <EnvioPush />


      <AvaliacaoProfessor alunos={alunos} professorId={professorId} />

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <Paperclip className="size-4 text-primary" /> ANEXAR CONTRATO DE UM ALUNO
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Envie um contrato já preenchido (foto ou PDF) para o cadastro do responsável. O responsável poderá
          ver e baixar, mas não excluir.
        </p>

        <button
          type="button"
          onClick={() => setNovoAberto((v) => !v)}
          className="mt-3 flex items-center gap-2 rounded-md border border-primary px-3 py-2 font-display text-[11px] tracking-tight text-primary active:scale-95"
        >
          <UserPlus className="size-4" /> {novoAberto ? "FECHAR NOVO ALUNO" : "ADICIONAR NOVO ALUNO"}
        </button>

        {novoAberto ? (
          <form
            onSubmit={(e) => void salvarNovoAluno(e)}
            className="mt-3 space-y-2 rounded-md border border-border bg-background/60 p-3"
          >
            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Responsável
              </span>
              <select
                value={novoAluno.userId}
                onChange={(e) => setNovoAluno((f) => ({ ...f, userId: e.target.value }))}
                className="w-full min-w-0 max-w-full truncate rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Escolha o responsável…</option>
                {[...perfis]
                  .sort((a, b) => (a.nome_responsavel || "").localeCompare(b.nome_responsavel || "", "pt-BR"))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome_responsavel || "(sem nome)"}
                      {p.telefone ? ` — ${p.telefone}` : ""}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Nome do aluno
              </span>
              <input
                type="text"
                value={novoAluno.nome}
                onChange={(e) => setNovoAluno((f) => ({ ...f, nome: e.target.value }))}
                className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Data de nascimento (opcional)
              </span>
              <input
                type="date"
                value={novoAluno.nascimento}
                onChange={(e) => setNovoAluno((f) => ({ ...f, nascimento: e.target.value }))}
                className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={novoAluno.fisico}
                onChange={(e) => setNovoAluno((f) => ({ ...f, fisico: e.target.checked }))}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                Contrato físico (papel) — libera o acesso do responsável e não pede contrato e PAR-Q no app.
              </span>
            </label>

            <label className="block space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Anexar documento (foto ou PDF, opcional)
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
                className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-xs"
              />
            </label>

            <button
              type="submit"
              disabled={criandoAluno}
              className="w-full rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground disabled:opacity-60"
            >
              {criandoAluno ? "SALVANDO…" : "CADASTRAR ALUNO"}
            </button>
          </form>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={alunoSel}
            onChange={(e) => setAlunoSel(e.target.value)}
            className="w-full min-w-0 max-w-full truncate rounded-md border border-border bg-background px-3 py-2 text-sm sm:w-auto"
          >
            <option value="">Escolha o aluno…</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} — {perfis.find((p) => p.id === a.user_id)?.nome_responsavel || "responsável"}
              </option>
            ))}
          </select>
          <select
            value={tipoSel}
            onChange={(e) => setTipoSel(e.target.value)}
            className="min-w-0 max-w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="contrato">Contrato assinado</option>
            <option value="ficha">Ficha / PAR-Q</option>
            <option value="documento">Documento pessoal</option>
            <option value="outro">Outro</option>
          </select>
          <input
            ref={inputArquivo}
            type="file"
            accept="image/*,application/pdf"
            id="anexo-professor"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void anexar(f);
            }}
          />
          <label
            htmlFor="anexo-professor"
            className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm text-primary-foreground"
          >
            <Upload className="size-4" /> {enviando ? "ENVIANDO…" : "ANEXAR"}
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <FileText className="size-4 text-primary" /> DOCUMENTOS PARA CONFERIR
          {docs.filter((d) => !d.liberado).length > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 font-mono text-[10px] text-destructive-foreground">
              {docs.filter((d) => !d.liberado).length} pendente
              {docs.filter((d) => !d.liberado).length > 1 ? "s" : ""}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setVerDocs((v) => !v)}
          className="mt-3 rounded-md border border-primary px-3 py-1.5 font-display text-xs tracking-tight text-primary"
        >
          {verDocs ? "OCULTAR DOCUMENTOS" : `VER DOCUMENTOS (${docs.length})`}
        </button>
        <ul className={`mt-3 space-y-2 ${verDocs ? "" : "hidden"}`}>
          {docs.map((d) => {
            const alu = alunos.find((a) => a.id === d.aluno_id);
            const resp = perfis.find((p) => p.id === d.user_id);
            return (
              <li key={d.id} className="rounded-md border border-border bg-background/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {new Date(d.created_at).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-sm font-medium text-primary">
                  {alu?.nome ?? "Aluno não identificado"}
                  {alu?.matricula ? ` • ${alu.matricula}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Responsável: {resp?.nome_responsavel || "—"}
                  {d.enviado_por_professor ? " • anexado pelo professor" : ""}
                </p>
                <p className="mt-1 text-sm">{d.nome_arquivo}</p>
                <p
                  className={`mt-1 font-mono text-[9px] uppercase tracking-widest ${
                    d.liberado ? "text-primary" : "text-destructive"
                  }`}
                >
                  {d.liberado ? "Liberado para o responsável" : "Aguardando sua conferência"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void liberar(d, !d.liberado)}
                    className={`rounded-md px-3 py-1.5 font-display text-xs tracking-tight ${
                      d.liberado
                        ? "border border-border text-muted-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {d.liberado ? "CANCELAR LIBERAÇÃO" : "CONFERIR E LIBERAR"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void abrir(d)}
                    className="rounded-md border border-primary px-3 py-1.5 font-display text-xs tracking-tight text-primary"
                  >
                    ABRIR PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluir(d)}
                    className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-display text-xs tracking-tight text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3" /> EXCLUIR
                  </button>
                </div>
              </li>
            );
          })}
          {docs.length === 0 && <li className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</li>}
        </ul>
      </section>
    </div>
  );
}

