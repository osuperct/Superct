import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { FileText, LogOut, Paperclip, Send, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { cpfDisponivel, entrarComCpfOuEmail, pedirNovaSenha } from "@/lib/auth.functions";
import { apenasDigitos, cpfValido, formatarCpf } from "@/lib/cpf";

import { supabase } from "@/integrations/supabase/client";
import { Assinatura } from "@/components/Assinatura";
import { gerarDocumentoPdf } from "@/lib/documentoPdf";

const EMAIL_SUPER_CT = "osuper.c.t@gmail.com";
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

type Aluno = { id: string; nome: string; idade: number | null };
type Documento = { id: string; tipo: string; nome_arquivo: string; caminho: string; created_at: string };

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
        const r = await entrar({ data: { identificador: email.trim(), senha } });
        if (!r.ok) {
          setAviso(r.erro);
          return;
        }
        const { error } = await supabase.auth.setSession({
          access_token: r.access_token,
          refresh_token: r.refresh_token,
        });
        if (error) throw error;
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

function Painel({ session }: { session: Session }) {
  const uid = session.user.id;
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [novoAluno, setNovoAluno] = useState("");
  const [novaIdade, setNovaIdade] = useState("");
  const [tipoDoc, setTipoDoc] = useState("contrato");
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [aba, setAba] = useState<"documentos" | "online">("documentos");
  const inputArquivo = useRef<HTMLInputElement>(null);

  const recarregar = useCallback(async () => {
    const [{ data: a }, { data: d }] = await Promise.all([
      supabase.from("alunos").select("id, nome, idade").order("created_at"),
      supabase.from("documentos").select("id, tipo, nome_arquivo, caminho, created_at").order("created_at", {
        ascending: false,
      }),
    ]);
    setAlunos((a ?? []) as Aluno[]);
    setDocumentos((d ?? []) as Documento[]);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  async function adicionarAluno(e: React.FormEvent) {
    e.preventDefault();
    const nome = novoAluno.trim();
    if (!nome) return;
    const { error } = await supabase.from("alunos").insert({
      user_id: uid,
      nome,
      idade: novaIdade ? Number(novaIdade) : null,
    });
    if (error) {
      toast.error("Não foi possível salvar o aluno.");
      return;
    }
    setNovoAluno("");
    setNovaIdade("");
    toast.success("Aluno adicionado!");
    void recarregar();
  }

  async function anexar(arquivo: File) {
    if (arquivo.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 20 MB).");
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
      nome_arquivo: arquivo.name,
      caminho,
    });
    setEnviandoArquivo(false);
    if (inputArquivo.current) inputArquivo.current.value = "";
    toast.success("Documento anexado!");
    void recarregar();
  }

  async function abrir(doc: Documento) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.caminho, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Não foi possível abrir o arquivo.");
  }

  async function remover(doc: Documento) {
    await supabase.storage.from(BUCKET).remove([doc.caminho]);
    await supabase.from("documentos").delete().eq("id", doc.id);
    toast.success("Documento removido.");
    void recarregar();
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  return (
    <div className="mt-6">
      <LembreteAcesso />
      <div className="flex items-center justify-between rounded-md border border-border bg-card/50 p-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Conectado como</p>
          <p className="text-sm">{session.user.email}</p>
        </div>
        <button
          type="button"
          onClick={sair}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          <LogOut className="size-3" /> Sair
        </button>
      </div>

      <section className="mt-5 rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <UserPlus className="size-4 text-primary" /> ALUNOS
        </h2>
        <ul className="mt-2 space-y-1">
          {alunos.map((a) => (
            <li key={a.id} className="text-sm">
              • {a.nome}
              {a.idade ? ` — ${a.idade} anos` : ""}
            </li>
          ))}
          {alunos.length === 0 && <li className="text-sm text-muted-foreground">Nenhum aluno cadastrado.</li>}
        </ul>
        <form onSubmit={adicionarAluno} className="mt-3 flex gap-2">
          <input
            value={novoAluno}
            onChange={(e) => setNovoAluno(e.target.value)}
            placeholder="Nome do aluno"
            maxLength={120}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={novaIdade}
            onChange={(e) => setNovaIdade(e.target.value)}
            placeholder="Idade"
            type="number"
            className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button type="submit" className="rounded-md bg-primary px-3 font-display text-sm text-primary-foreground">
            +
          </button>
        </form>
      </section>

      <div className="mt-5 flex gap-2">
        {(
          [
            ["documentos", "ANEXAR DOCUMENTOS"],
            ["online", "PREENCHER ONLINE"],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`flex-1 rounded-md px-3 py-2 font-display text-xs tracking-tight ${
              aba === id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "documentos" ? (
        <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
            <Paperclip className="size-4 text-primary" /> DOCUMENTOS DO ALUNO
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Anexe aqui o contrato de prestação de serviço e a ficha do aluno preenchidos à mão e escaneados
            (foto ou PDF).
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
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

          <ul className="mt-4 space-y-2">
            {documentos.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{d.nome_arquivo}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {d.tipo} • {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => abrir(d)}
                    className="rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => remover(d)}
                    className="rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
            {documentos.length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</li>
            )}
          </ul>
        </section>
      ) : (
        <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
            <FileText className="size-4 text-primary" /> PREENCHER ONLINE
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada documento abre numa página só dele: você digita os espaços em branco pelo celular, assina com a
            canetinha e ele fica arquivado aqui nos documentos do aluno.
          </p>
          <div className="mt-4 space-y-2">
            {(
              [
                ["contrato", "CONTRATO DE PRESTAÇÃO DE SERVIÇO"],
                ["ficha", "FICHA DO ALUNO (ANEXO)"],
              ] as const
            ).map(([id, rotulo]) => (
              <Link
                key={id}
                to="/documento/$tipo"
                params={{ tipo: id }}
                className="flex items-center justify-between gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground"
              >
                {rotulo} <Send className="size-4 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
