import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { Eye, EyeOff, GraduationCap, Paperclip, Send, ShieldCheck, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { cpfDisponivel, entrarComCpfOuEmail, pedirNovaSenha } from "@/lib/auth.functions";
import { apenasDigitos, cpfValido, formatarCpf } from "@/lib/cpf";

import { AvaliacaoResponsavel } from "@/components/AvaliacaoResponsavel";
import { AvisosResponsavel } from "@/components/AvisosResponsavel";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "documentos-alunos";

const TERMO_IMAGEM =
  "Autorizo, de forma gratuita e por prazo indeterminado, o uso da imagem e da voz do(a) aluno(a) em fotos e vídeos captados nas atividades do Super CT, para divulgação nas redes sociais e materiais de comunicação do Super CT, sem qualquer ônus ou contrapartida financeira.";

export const Route = createFileRoute("/conta")({
  head: () => ({
    meta: [
      { title: "Área do Responsável — Super CT" },
      {
        name: "description",
        content:
          "Entre ou cadastre-se na área do responsável do Super CT para anexar documentos do aluno e preencher contrato e ficha online.",
      },
      { property: "og:title", content: "Área do Responsável — Super CT" },
      {
        property: "og:description",
        content: "Cadastro do responsável, documentos do aluno e formulários online do Super CT.",
      },
    ],
  }),
  component: ContaPage,
});

type Aluno = { id: string; nome: string; idade: number | null; matricula: string | null };
type Documento = {
  id: string;
  tipo: string;
  nome_arquivo: string;
  caminho: string;
  created_at: string;
  aluno_id: string | null;
  enviado_por_professor: boolean;
  liberado: boolean;
};

const DESCRICAO_DOC: Record<string, string> = {
  contrato: "Contrato de prestação de serviço assinado",
  ficha: "Ficha de anamnese e PAR-Q assinada",
  documento: "Documento pessoal (RG / certidão)",
  outro: "Outro documento",
};

function ContaPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-5 py-10">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Voltar
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tighter">
          ÁREA DO <span className="text-primary">RESPONSÁVEL</span>
        </h1>
        {session && <Saudacao session={session} />}

        {carregando ? (
          <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
        ) : session ? (
          <Painel session={session} />
        ) : (
          <Autenticacao />
        )}
      </main>
    </div>
  );
}

/* ------------------------------- LOGIN / CADASTRO ------------------------------- */

function Autenticacao() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [alunoNome, setAlunoNome] = useState("");
  const [alunoIdade, setAlunoIdade] = useState("");
  const [aceite, setAceite] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<{ email: string; senha: string } | null>(null);
  const entrar = useServerFn(entrarComCpfOuEmail);
  const pedirSenha = useServerFn(pedirNovaSenha);
  const checarCpf = useServerFn(cpfDisponivel);
  const [recuperando, setRecuperando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setAviso(null);
    try {
      if (modo === "entrar") {
        const identificador = email.trim();
        if (identificador.includes("@")) {
          const { error } = await supabase.auth.signInWithPassword({
            email: identificador.toLowerCase(),
            password: senha,
          });
          if (error) {
            setAviso("E-mail ou senha incorretos.");
            return;
          }
        } else {
          const r = await entrar({ data: { identificador, senha } });
          if (!r.ok) {
            setAviso(r.erro);
            return;
          }
          const { error } = await supabase.auth.setSession({
            access_token: r.access_token,
            refresh_token: r.refresh_token,
          });
          if (error) throw error;
        }
        toast.success("Bem-vindo de volta!");
      } else {
        if (!aceite) {
          setAviso("É preciso aceitar o termo de uso de imagem para concluir o cadastro.");
          return;
        }
        if (!cpfValido(cpf)) {
          setAviso("Confira o CPF do responsável: os números não formam um CPF válido.");
          return;
        }
        const { livre } = await checarCpf({ data: { cpf } });
        if (!livre) {
          setAviso("Este CPF já tem uma conta no Super CT. Entre com o CPF ou peça uma nova senha.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/conta`,
            data: {
              nome_responsavel: nome.trim(),
              telefone: telefone.trim(),
              cpf: apenasDigitos(cpf),
              aluno_nome: alunoNome.trim(),
              aluno_idade: alunoIdade,
              aceite_imagem: aceite,
            },
          },
        });
        if (error) throw error;
        sessionStorage.setItem("superct_acesso", JSON.stringify({ email: email.trim(), senha }));
        setCredenciais({ email: email.trim(), senha });
        if (!data.session) {
          setAviso("Cadastro criado! Confira seu e-mail e clique no link de confirmação para entrar.");
        } else {
          toast.success("Cadastro concluído!");
        }
      }
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setOcupado(false);
    }
  }

  async function esqueciSenha() {
    const alvo = email.trim();
    if (!alvo) {
      setAviso("Digite seu CPF ou e-mail acima para receber o link de nova senha.");
      return;
    }
    setRecuperando(true);
    setAviso(null);
    const r = await pedirSenha({
      data: { identificador: alvo, redirectTo: `${window.location.origin}/reset-password` },
    });
    setRecuperando(false);
    if (!r.ok) {
      setAviso(r.erro);
      return;
    }
    setAviso(
      "Se existir uma conta com esse CPF ou e-mail, enviamos um link para criar uma nova senha. Confira sua caixa de entrada e o spam.",
    );
    toast.success("Link de nova senha enviado!");
  }

  const textoAcesso = credenciais
    ? `SUPER CT — Professor Tio Victor\nSeus dados de acesso à Área do Responsável:\nE-mail: ${credenciais.email}\nSenha: ${credenciais.senha}\nEntre em: ${window.location.origin}/conta`
    : "";

  if (credenciais) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-primary/60 bg-card/60 p-4">
          <h2 className="font-display text-lg tracking-tight text-primary">GUARDE SEU ACESSO</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Salve estes dados agora — é com eles que você entra na sua área e vê os documentos do aluno.
          </p>
          <dl className="mt-3 space-y-2 font-mono text-xs">
            <div className="rounded-md border border-border bg-background/60 p-2">
              <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">E-mail</dt>
              <dd className="break-all text-foreground">{credenciais.email}</dd>
            </div>
            <div className="rounded-md border border-border bg-background/60 p-2">
              <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">Senha</dt>
              <dd className="break-all text-foreground">{credenciais.senha}</dd>
            </div>
          </dl>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(textoAcesso)
                  .then(() => toast.success("Dados de acesso copiados!"))
                  .catch(() => toast.error("Copie manualmente os dados acima."));
              }}
              className="rounded-md bg-primary px-3 py-2 font-display text-xs tracking-tight text-primary-foreground"
            >
              COPIAR DADOS
            </button>
            <a
              href={`mailto:${credenciais.email}?subject=${encodeURIComponent("Seu acesso — Super CT")}&body=${encodeURIComponent(textoAcesso)}`}
              className="rounded-md border border-primary px-3 py-2 text-center font-display text-xs tracking-tight text-primary"
            >
              ENVIAR PRO MEU E-MAIL
            </a>
          </div>
        </div>
        {aviso && <p className="text-xs text-primary">{aviso}</p>}
        <button
          type="button"
          onClick={() => setCredenciais(null)}
          className="w-full rounded-md border border-border px-4 py-2 font-display text-xs tracking-tight text-muted-foreground"
        >
          JÁ GUARDEI, CONTINUAR
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        {(["entrar", "cadastrar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`flex-1 rounded-md px-3 py-2 font-display text-sm tracking-tight ${
              modo === m ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {m === "entrar" ? "ENTRAR" : "CRIAR CONTA"}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="mt-5 space-y-3">
        {modo === "cadastrar" && (
          <>
            <Campo label="Nome do responsável" value={nome} onChange={setNome} required maxLength={120} />
            <Campo
              label="Telefone / WhatsApp"
              value={telefone}
              onChange={setTelefone}
              required
              maxLength={20}
              type="tel"
            />
            <Campo
              label="CPF do responsável"
              value={cpf}
              onChange={(v) => setCpf(formatarCpf(v))}
              required
              maxLength={14}
              inputMode="numeric"
            />
            <Campo label="Nome do aluno" value={alunoNome} onChange={setAlunoNome} required maxLength={120} />
            <Campo label="Idade do aluno" value={alunoIdade} onChange={setAlunoIdade} required type="number" />
          </>
        )}
        <Campo
          label={modo === "entrar" ? "CPF ou e-mail" : "E-mail do responsável"}
          value={email}
          onChange={setEmail}
          required
          type={modo === "entrar" ? "text" : "email"}
          maxLength={255}
        />
        <Campo label="Senha" value={senha} onChange={setSenha} required type="password" maxLength={72} />

        {modo === "cadastrar" && (
          <label className="flex gap-3 rounded-md border border-border bg-card/50 p-3 text-xs leading-relaxed">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
            />
            <span>
              <strong className="text-primary">Termo de uso de imagem.</strong> {TERMO_IMAGEM}
            </span>
          </label>
        )}

        {aviso && <p className="text-xs text-primary">{aviso}</p>}

        <button
          type="submit"
          disabled={ocupado}
          className="w-full rounded-md bg-primary px-4 py-3 font-display tracking-tight text-primary-foreground disabled:opacity-60"
        >
          {ocupado ? "AGUARDE…" : modo === "entrar" ? "ENTRAR" : "CRIAR CONTA"}
        </button>

        {modo === "entrar" && (
          <Link
            to="/adm"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/60 bg-primary/5 px-3 py-2 font-display text-xs tracking-tight text-primary"
          >
            <ShieldCheck className="size-3.5" /> ÁREA ADM
          </Link>
        )}


        {modo === "entrar" && (
          <button
            type="button"
            onClick={() => void esqueciSenha()}
            disabled={recuperando}
            className="w-full font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline decoration-primary/60 disabled:opacity-60"
          >
            {recuperando ? "Enviando…" : "Esqueci minha senha"}
          </button>
        )}
      </form>
    </div>
  );
}


function Campo({
  label,
  value,
  onChange,
  type = "text",
  required,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: "numeric" | "text" | "tel" | "email";
}) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

/* ---------------------------------- PAINEL ---------------------------------- */

function LembreteAcesso() {
  const [dados, setDados] = useState<{ email: string; senha: string } | null>(null);

  useEffect(() => {
    const bruto = sessionStorage.getItem("superct_acesso");
    if (!bruto) return;
    try {
      setDados(JSON.parse(bruto) as { email: string; senha: string });
    } catch {
      sessionStorage.removeItem("superct_acesso");
    }
  }, []);

  if (!dados) return null;

  const texto = `SUPER CT — Professor Tio Victor\nSeus dados de acesso à Área do Responsável:\nE-mail: ${dados.email}\nSenha: ${dados.senha}\nEntre em: ${window.location.origin}/conta`;

  function guardei() {
    sessionStorage.removeItem("superct_acesso");
    setDados(null);
  }

  return (
    <div className="mb-4 rounded-lg border border-primary/60 bg-card/60 p-4">
      <h2 className="font-display text-lg tracking-tight text-primary">GUARDE SEU ACESSO</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Salve estes dados agora — é com eles que você entra na sua área e vê os documentos do aluno.
      </p>
      <dl className="mt-3 space-y-2 font-mono text-xs">
        <div className="rounded-md border border-border bg-background/60 p-2">
          <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">E-mail</dt>
          <dd className="break-all text-foreground">{dados.email}</dd>
        </div>
        <div className="rounded-md border border-border bg-background/60 p-2">
          <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">Senha</dt>
          <dd className="break-all text-foreground">{dados.senha}</dd>
        </div>
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(texto)
              .then(() => toast.success("Dados de acesso copiados!"))
              .catch(() => toast.error("Copie manualmente os dados acima."));
          }}
          className="rounded-md bg-primary px-3 py-2 font-display text-xs tracking-tight text-primary-foreground"
        >
          COPIAR DADOS
        </button>
        <a
          href={`mailto:${dados.email}?subject=${encodeURIComponent("Seu acesso — Super CT")}&body=${encodeURIComponent(texto)}`}
          className="rounded-md border border-primary px-3 py-2 text-center font-display text-xs tracking-tight text-primary"
        >
          ENVIAR PRO MEU E-MAIL
        </a>
      </div>
      <button
        type="button"
        onClick={guardei}
        className="mt-2 w-full rounded-md border border-border px-4 py-2 font-display text-xs tracking-tight text-muted-foreground"
      >
        JÁ GUARDEI
      </button>
    </div>
  );
}

function primeiroNome(nome?: string | null) {
  if (!nome) return "";
  return nome.trim().split(" ")[0] ?? nome;
}

function Saudacao({ session }: { session: Session }) {
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    const meta = session.user.user_metadata;
    const nomeMeta = typeof meta?.["nome_responsavel"] === "string" ? meta["nome_responsavel"] : "";
    if (nomeMeta) {
      setNome(primeiroNome(nomeMeta));
      return;
    }
    let ativo = true;
    void supabase
      .from("perfis")
      .select("nome_responsavel")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (ativo && data?.nome_responsavel) setNome(primeiroNome(data.nome_responsavel));
      });
    return () => {
      ativo = false;
    };
  }, [session]);

  if (!nome) return null;

  return (
    <p className="mt-1 font-body text-sm text-muted-foreground">
      Olá, <span className="font-semibold text-foreground">{nome}</span>!
    </p>
  );
}

function Painel({ session }: { session: Session }) {
  const uid = session.user.id;
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tipoDoc, setTipoDoc] = useState("contrato");
  const [alunoDoc, setAlunoDoc] = useState("");
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [mostrarDocs, setMostrarDocs] = useState(false);
  const [alunoDocsAberto, setAlunoDocsAberto] = useState<string | null>(null);

  const [entregues, setEntregues] = useState<{ tipo: string; aluno_id: string | null }[]>([]);

  const recarregar = useCallback(async () => {
    const [{ data: a }, { data: d }, { data: todos }] = await Promise.all([
      supabase.from("alunos").select("id, nome, idade, matricula").eq("user_id", uid).order("created_at"),
      supabase
        .from("documentos")
        .select("id, tipo, nome_arquivo, caminho, created_at, aluno_id, enviado_por_professor, liberado")
        .eq("user_id", uid)
        .eq("oculto_responsavel", false)
        .order("created_at", { ascending: false }),
      supabase.from("documentos").select("tipo, aluno_id").eq("user_id", uid),
    ]);
    setAlunos((a ?? []) as Aluno[]);
    setDocumentos((d ?? []) as Documento[]);
    setEntregues((todos ?? []) as { tipo: string; aluno_id: string | null }[]);
  }, [uid]);


  const [ehProfessor, setEhProfessor] = useState(false);
  const [ehAdm, setEhAdm] = useState(false);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  useEffect(() => {
    let ativo = true;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .then(({ data }) => {
        if (ativo) {
          setEhProfessor((data ?? []).some((p) => p.role === "professor"));
          setEhAdm((data ?? []).some((p) => p.role === "adm"));
        }
      });
    return () => {
      ativo = false;
    };
  }, [uid]);





  async function anexar(arquivo: File) {
    if (arquivo.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 20 MB).");
      return;
    }
    const destino = alunoDoc || alunos[0]?.id || "";
    if (!destino) {
      toast.error("Preencha primeiro o contrato do aluno para poder anexar documentos dele.");
      return;
    }
    setEnviandoArquivo(true);
    const limpo = arquivo.name.replace(/[^\w.\-]+/g, "_");
    const caminho = `${uid}/${Date.now()}-${limpo}`;
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo);
    if (error) {
      setEnviandoArquivo(false);
      toast.error("Falha ao enviar o arquivo.");
      return;
    }
    await supabase.from("documentos").insert({
      user_id: uid,
      tipo: tipoDoc,
      aluno_id: destino,
      nome_arquivo: arquivo.name,
      caminho,
    });
    setEnviandoArquivo(false);
    if (inputArquivo.current) inputArquivo.current.value = "";
    toast.success("Documento anexado!");
    void recarregar();
  }

  async function abrir(doc: Documento) {
    if (!doc.liberado) {
      toast.info("Documento aguardando liberação do professor. Assim que ele conferir, você poderá ver e baixar.");
      return;
    }
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.caminho, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Não foi possível abrir o arquivo.");
  }


  return (
    <div className="mt-6">
      <LembreteAcesso />
      <div className="rounded-md border border-border bg-card/50 p-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Conectado como</p>
        <p className="text-sm">{session.user.email}</p>
      </div>

      {ehProfessor && (
          <Link
            to="/professor"
            className="mt-3 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground"
          >
            <GraduationCap className="size-4" /> ÁREA DO PROFESSOR
          </Link>
      )}
      {ehAdm && (
          <Link
            to="/adm"
            className="mt-2 flex items-center justify-center gap-2 rounded-md border border-primary/60 bg-primary/5 px-4 py-3 font-display text-sm tracking-tight text-primary"
          >
            <ShieldCheck className="size-4" /> ÁREA ADM
          </Link>
      )}


      <section className="mt-5 rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <UserPlus className="size-4 text-primary" /> ALUNOS E DOCUMENTOS
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          O aluno entra nesta lista quando o contrato dele é preenchido e assinado. Abaixo de cada nome ficam
          todos os documentos daquele aluno.
        </p>
        <ul className="mt-3 space-y-3">
          {alunos.map((a) => {
            const docsAluno = documentos.filter((d) => d.aluno_id === a.id);
            const doAluno = entregues.filter((e) => e.aluno_id === a.id);
            const faltando = (["contrato", "ficha"] as const).filter(
              (t) => !doAluno.some((e) => e.tipo === t),
            );

            return (
              <li key={a.id} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 text-sm">
                    {a.nome}
                    {a.idade ? ` — ${a.idade} anos` : ""}
                    {a.matricula && (
                      <span className="ml-2 rounded border border-primary/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                        Matrícula {a.matricula}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {docsAluno.length} {docsAluno.length === 1 ? "arquivo" : "arquivos"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlunoDocsAberto(alunoDocsAberto === a.id ? null : a.id)}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
                  >
                    {alunoDocsAberto === a.id ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {alunoDocsAberto === a.id ? "OCULTAR" : "VER ARQUIVOS"}
                  </button>
                </div>
                {alunoDocsAberto === a.id && (
                  <ul className="mt-2 space-y-1">
                    {docsAluno.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-primary">
                            {DESCRICAO_DOC[d.tipo] ?? "Documento anexado"}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {d.nome_arquivo} • {new Date(d.created_at).toLocaleDateString("pt-BR")}
                            {d.enviado_por_professor ? " • enviado pelo professor" : ""}
                          </span>
                          <span
                            className={`mt-0.5 block font-mono text-[9px] uppercase tracking-widest ${
                              d.liberado ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {d.liberado ? "Conferido" : "Aguardando liberação"}
                          </span>
                        </span>
                        {d.liberado && (
                          <button
                            type="button"
                            onClick={() => abrir(d)}
                            className="shrink-0 rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase"
                          >
                            Ver
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {faltando.length > 0 && (
                  <div className="mt-3 rounded-md border border-primary/60 bg-primary/10 p-3">
                    <p className="text-[11px]">
                      Falta concluir o preenchimento de {a.nome}:{" "}
                      <span className="text-primary">
                        {faltando.map((t) => (t === "contrato" ? "contrato" : "ficha de anamnese / PAR-Q")).join(" e ")}
                      </span>
                      .
                    </p>
                    {faltando.map((t) => (
                      <Link
                        key={t}
                        to="/documento/$tipo"
                        params={{ tipo: t }}
                        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 font-display text-xs tracking-tight text-primary-foreground"
                      >
                        {t === "contrato" ? "PREENCHER O CONTRATO AGORA" : "PREENCHER A FICHA / PAR-Q AGORA"}
                        <Send className="size-3 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}

          {alunos.length === 0 && (
            <li className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              Nenhum aluno na lista. Preencha o contrato do aluno para incluí-lo aqui.
            </li>
          )}
        </ul>
        <Link
          to="/documento/$tipo"
          params={{ tipo: "contrato" }}
          className="mt-3 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground"
        >
          PREENCHER CONTRATO DE UM ALUNO <Send className="size-4 shrink-0" />
        </Link>
        <Link
          to="/documento/$tipo"
          params={{ tipo: "ficha" }}
          className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground"
        >
          PREENCHER FICHA PAR-Q DO ALUNO <Send className="size-4 shrink-0" />
        </Link>
      </section>

      <AvisosResponsavel uid={uid} />

      <AvaliacaoResponsavel uid={uid} alunos={alunos} />

      {(
        <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">

          <div className="flex items-start justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
              <Paperclip className="size-4 text-primary" /> DOCUMENTOS DO ALUNO ({documentos.length})
            </h2>
            {documentos.length > 0 && (
              <button
                type="button"
                onClick={() => setMostrarDocs(!mostrarDocs)}
                className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
              >
                {mostrarDocs ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                {mostrarDocs ? "OCULTAR" : "VER ARQUIVOS"}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Todo documento passa pela conferência do professor: depois que ele liberar, o arquivo fica salvo aqui
            na matrícula do aluno para ver e baixar sempre que quiser. Anexe aqui o contrato de prestação de
            serviço e a ficha do aluno preenchidos à mão e escaneados
            (foto ou PDF). Escolha de qual aluno é o documento — ele aparece junto do nome dele na lista de
            alunos.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={alunoDoc || alunos[0]?.id || ""}
              onChange={(e) => setAlunoDoc(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {alunos.length === 0 && <option value="">Nenhum aluno com contrato preenchido</option>}
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
            <select
              value={tipoDoc}
              onChange={(e) => setTipoDoc(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="contrato">Contrato de prestação de serviço</option>
              <option value="ficha">Ficha do aluno</option>
              <option value="documento">Documento / RG / certidão</option>
              <option value="outro">Outro</option>
            </select>
            <input
              ref={inputArquivo}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void anexar(f);
              }}
              className="hidden"
              id="anexo"
            />
            <label
              htmlFor="anexo"
              className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-sm text-primary-foreground"
            >
              <Upload className="size-4" /> {enviandoArquivo ? "ENVIANDO…" : "ANEXAR"}
            </label>
          </div>

          {mostrarDocs && (
            <ul className="mt-4 space-y-2">
              {documentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{d.nome_arquivo}</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      {DESCRICAO_DOC[d.tipo] ?? "Documento"} •{" "}
                      {alunos.find((a) => a.id === d.aluno_id)?.nome ?? "sem aluno"} •{" "}
                      {new Date(d.created_at).toLocaleDateString("pt-BR")}
                      {d.liberado ? " • conferido" : " • aguardando liberação"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {d.liberado && (
                      <button
                        type="button"
                        onClick={() => abrir(d)}
                        className="rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase"
                      >
                        Ver
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!mostrarDocs && documentos.length > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">Clique em “VER ARQUIVOS” para ver a lista completa.</p>
          )}
          {documentos.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
          )}
        </section>
      )}

    </div>
  );
}
