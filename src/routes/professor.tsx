import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { FileText, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatarCpf } from "@/lib/cpf";

export const Route = createFileRoute("/professor")({
  head: () => ({
    meta: [
      { title: "Área do Professor — Super CT" },
      {
        name: "description",
        content:
          "Painel do Professor Tio Victor: matrículas dos alunos, fichas de anamnese e contratos assinados pelos responsáveis do Super CT.",
      },
      { property: "og:title", content: "Área do Professor — Super CT" },
      {
        property: "og:description",
        content: "Matrículas, fichas e contratos assinados dos alunos do Super CT.",
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
};
type Alu = { id: string; nome: string; idade: number | null; matricula: string | null; user_id: string };
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
          <Painel />
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

function Painel() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [alunos, setAlunos] = useState<Alu[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);

  const carregar = useCallback(async () => {
    const { data: papeis } = await supabase.from("user_roles").select("role");
    const ehProfessor = (papeis ?? []).some((p) => p.role === "professor");
    setAutorizado(ehProfessor);
    if (!ehProfessor) return;

    const [{ data: d }, { data: a }, { data: p }] = await Promise.all([
      supabase
        .from("documentos")
        .select("id, tipo, nome_arquivo, caminho, created_at, user_id")
        .order("created_at", { ascending: false }),
      supabase.from("alunos").select("id, nome, idade, matricula, user_id").order("matricula"),
      supabase.from("perfis").select("id, nome_responsavel, telefone, cpf"),
    ]);
    setDocs((d ?? []) as Doc[]);
    setAlunos((a ?? []) as Alu[]);
    setPerfis((p ?? []) as Perfil[]);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function abrir(doc: Doc) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.caminho, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Não foi possível abrir o arquivo.");
  }

  if (autorizado === null) return <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>;
  if (!autorizado)
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        Esta área é exclusiva do professor. Entre com a conta do Super CT (osuper.c.t@gmail.com) para acessar.
      </p>
    );

  const nomeDe = (uid: string) => perfis.find((p) => p.id === uid)?.nome_responsavel || "Responsável";
  const alunosDe = (uid: string) => alunos.filter((a) => a.user_id === uid);

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-lg border border-primary/50 bg-primary/5 p-4">
        <h2 className="font-display text-lg tracking-tight text-primary">PROFESSOR</h2>
        <p className="mt-2 text-sm font-medium">Victor Hugo Jorge de Siqueira</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          CREF 057790-G/MG
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <Users className="size-4 text-primary" /> ALUNOS MATRICULADOS ({alunos.length})
        </h2>

        <ul className="mt-3 space-y-2">
          {alunos.map((a) => {
            const perfil = perfis.find((p) => p.id === a.user_id);
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
              </li>
            );
          })}
          {alunos.length === 0 && <li className="text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</li>}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <FileText className="size-4 text-primary" /> CONTRATOS ASSINADOS ({docs.length})
        </h2>
        <ul className="mt-3 space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="rounded-md border border-border bg-background/40 p-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {new Date(d.created_at).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-sm">{d.nome_arquivo}</p>
              <button
                type="button"
                onClick={() => void abrir(d)}
                className="mt-2 rounded-md border border-primary px-3 py-1.5 font-display text-xs tracking-tight text-primary"
              >
                ABRIR PDF
              </button>
            </li>
          ))}
          {docs.length === 0 && <li className="text-sm text-muted-foreground">Nenhum contrato assinado ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
