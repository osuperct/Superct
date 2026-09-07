import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileDown, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatarValor, refMes, mesExtensoRef, type Mensalidade } from "@/lib/mensalidade";
import { diasDeAula, mesAtual, type Presenca } from "@/lib/presenca";
import {
  baixarBlob,
  relatorioConjunto,
  relatorioSeparado,
  type SecaoRelatorio,
} from "@/lib/relatorioPdf";

const TITLE = "Relatórios — Área ADM Super CT";
const DESCRIPTION =
  "Exportação em PDF de alunos ativos, mensalidades pagas, em aberto e em atraso, lista de chamada, matrículas recentes e financeiro total do Super CT.";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  errorComponent: () => (
    <Casca>
      <p className="text-sm text-muted-foreground">Não foi possível abrir os relatórios.</p>
    </Casca>
  ),
  component: RelatoriosPage,
});

function Casca({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-sm px-5 py-8">
        <Link to="/adm" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Área ADM
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl leading-tight tracking-tighter">
          <FileText className="size-6 shrink-0 text-primary" />
          <span>
            RELA<span className="text-primary">TÓRIOS</span>
          </span>
        </h1>
        <div className="mt-6 space-y-6">{children}</div>
      </main>
    </div>
  );
}

type Alu = { id: string; nome: string; idade: number | null; matricula: string | null; user_id: string; created_at: string };
type Perfil = { id: string; nome_responsavel: string; telefone: string | null };

const OPCOES = [
  { id: "ativos", rotulo: "Alunos ativos" },
  { id: "pagas", rotulo: "Mensalidades pagas" },
  { id: "aberto", rotulo: "Mensalidades em aberto" },
  { id: "atraso", rotulo: "Mensalidades em atraso" },
  { id: "chamada", rotulo: "Lista de chamada" },
  { id: "matriculas", rotulo: "Matrículas recentes" },
  { id: "financeiro", rotulo: "Financeiro total (formas de pagamento)" },
] as const;

type OpcaoId = (typeof OPCOES)[number]["id"];

function RelatoriosPage() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [alunos, setAlunos] = useState<Alu[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [escolhidas, setEscolhidas] = useState<OpcaoId[]>(["ativos"]);
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    if (!sessao.user) {
      setAutorizado(false);
      return;
    }
    const { data: papeis } = await supabase.from("user_roles").select("role").eq("user_id", sessao.user.id);
    const ehAdm = (papeis ?? []).some((p) => p.role === "adm");
    setAutorizado(ehAdm);
    if (!ehAdm) return;

    const { ano, mes } = mesAtual();
    const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const fim = `${ano}-${String(mes).padStart(2, "0")}-${String(new Date(ano, mes, 0).getDate()).padStart(2, "0")}`;

    const [{ data: a }, { data: p }, { data: m }, { data: pr }] = await Promise.all([
      supabase.from("alunos").select("id, nome, idade, matricula, user_id, created_at").order("nome"),
      supabase.from("perfis").select("id, nome_responsavel, telefone"),
      supabase.from("mensalidades").select("id, aluno_id, user_id, referencia, ativo, valor, pago, pago_em, forma"),
      supabase.from("presencas").select("id, aluno_id, user_id, dia").gte("dia", inicio).lte("dia", fim),
    ]);
    setAlunos((a ?? []) as Alu[]);
    setPerfis((p ?? []) as Perfil[]);
    setMensalidades((m ?? []) as Mensalidade[]);
    setPresencas((pr ?? []) as Presenca[]);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const mesRef = refMes();
  const nomeAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? "Aluno";
  const respDoAluno = (id: string) => {
    const alu = alunos.find((a) => a.id === id);
    return perfis.find((p) => p.id === alu?.user_id)?.nome_responsavel ?? "—";
  };
  const ativoNoMes = (alunoId: string) =>
    mensalidades.find((m) => m.aluno_id === alunoId && m.referencia === mesRef)?.ativo ?? true;

  function montarSecao(id: OpcaoId): SecaoRelatorio {
    if (id === "ativos") {
      const lista = alunos.filter((a) => ativoNoMes(a.id));
      return {
        titulo: `Alunos ativos — ${mesExtensoRef(mesRef)}`,
        colunas: ["Matrícula", "Aluno", "Idade", "Responsável"],
        linhas: lista.map((a) => [
          a.matricula ?? "—",
          a.nome,
          a.idade ? `${a.idade} anos` : "—",
          perfis.find((p) => p.id === a.user_id)?.nome_responsavel ?? "—",
        ]),
        resumo: `Total de alunos ativos: ${lista.length}`,
      };
    }
    if (id === "pagas") {
      const lista = mensalidades.filter((m) => m.pago);
      const total = lista.reduce((s, m) => s + (m.valor ?? 0), 0);
      return {
        titulo: "Mensalidades pagas",
        colunas: ["Mês", "Aluno", "Valor", "Forma"],
        linhas: lista.map((m) => [mesExtensoRef(m.referencia), nomeAluno(m.aluno_id), formatarValor(m.valor), m.forma ?? "—"]),
        resumo: `Total recebido: ${formatarValor(total)} em ${lista.length} mensalidade(s)`,
      };
    }
    if (id === "aberto") {
      const lista = mensalidades.filter((m) => !m.pago && m.ativo && m.referencia >= mesRef);
      const total = lista.reduce((s, m) => s + (m.valor ?? 0), 0);
      return {
        titulo: "Mensalidades em aberto (mês vigente)",
        colunas: ["Mês", "Aluno", "Responsável", "Valor"],
        linhas: lista.map((m) => [
          mesExtensoRef(m.referencia),
          nomeAluno(m.aluno_id),
          respDoAluno(m.aluno_id),
          formatarValor(m.valor),
        ]),
        resumo: `Total a receber: ${formatarValor(total)} em ${lista.length} mensalidade(s)`,
      };
    }
    if (id === "atraso") {
      const lista = mensalidades.filter((m) => !m.pago && m.ativo && m.referencia < mesRef);
      const total = lista.reduce((s, m) => s + (m.valor ?? 0), 0);
      return {
        titulo: "Mensalidades em atraso (meses anteriores)",
        colunas: ["Mês", "Aluno", "Responsável", "Valor"],
        linhas: lista.map((m) => [
          mesExtensoRef(m.referencia),
          nomeAluno(m.aluno_id),
          respDoAluno(m.aluno_id),
          formatarValor(m.valor),
        ]),
        resumo: `Total em atraso: ${formatarValor(total)} em ${lista.length} mensalidade(s)`,
      };
    }
    if (id === "chamada") {
      const { ano, mes } = mesAtual();
      const dias = diasDeAula(ano, mes);
      const uteis = dias.filter((d) => !d.feriado).length;
      const lista = alunos.filter((a) => ativoNoMes(a.id));
      return {
        titulo: `Lista de chamada — ${mesExtensoRef(mesRef)}`,
        colunas: ["Aluno", "Presenças", "Faltas", "Dias de treino"],
        linhas: lista.map((a) => {
          const presentes = presencas.filter((p) => p.aluno_id === a.id).length;
          return [a.nome, String(presentes), String(Math.max(uteis - presentes, 0)), String(uteis)];
        }),
        resumo: `Dias de treino no mês (segunda a sexta, sem feriados): ${uteis}`,
      };
    }
    if (id === "matriculas") {
      const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const lista = alunos
        .filter((a) => new Date(a.created_at).getTime() >= limite)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return {
        titulo: "Matrículas recentes (últimos 30 dias)",
        colunas: ["Data", "Matrícula", "Aluno", "Responsável"],
        linhas: lista.map((a) => [
          new Date(a.created_at).toLocaleDateString("pt-BR"),
          a.matricula ?? "—",
          a.nome,
          perfis.find((p) => p.id === a.user_id)?.nome_responsavel ?? "—",
        ]),
        resumo: `Novas matrículas: ${lista.length}`,
      };
    }
    const pagas = mensalidades.filter((m) => m.pago);
    const grupos = new Map<string, { qtd: number; total: number }>();
    for (const m of pagas) {
      const chave = m.forma?.trim() || "Não informado";
      const atual = grupos.get(chave) ?? { qtd: 0, total: 0 };
      grupos.set(chave, { qtd: atual.qtd + 1, total: atual.total + (m.valor ?? 0) });
    }
    const total = pagas.reduce((s, m) => s + (m.valor ?? 0), 0);
    return {
      titulo: "Financeiro total por forma de pagamento",
      colunas: ["Forma", "Quantidade", "Valor"],
      linhas: [...grupos.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([forma, v]) => [forma, String(v.qtd), formatarValor(v.total)]),
      resumo: `Total geral recebido: ${formatarValor(total)}`,
    };
  }

  function alternar(id: OpcaoId) {
    setEscolhidas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function exportar(modo: "conjunto" | "separado") {
    if (escolhidas.length === 0) {
      toast.error("Escolha pelo menos um relatório.");
      return;
    }
    setGerando(true);
    try {
      const secoes = escolhidas.map(montarSecao);
      if (modo === "conjunto") {
        baixarBlob(await relatorioConjunto(secoes), `relatorio-super-ct-${new Date().toISOString().slice(0, 10)}.pdf`);
      } else {
        await Promise.all(secoes.map(async (secao, i) => {
          const nome = OPCOES[OPCOES.findIndex((o) => o.id === escolhidas[i])]?.id ?? "relatorio";
          baixarBlob(await relatorioSeparado(secao), `relatorio-${nome}-${new Date().toISOString().slice(0, 10)}.pdf`);
        }));
      }
      toast.success(modo === "conjunto" ? "PDF gerado." : "PDFs gerados.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
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
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" /> Esta área é restrita à administração.
        </p>
      </Casca>
    );

  return (
    <Casca>
      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="font-display text-lg tracking-tight">ESCOLHA O QUE EXPORTAR</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Marque um ou vários relatórios. Você pode gerar tudo num PDF só ou um PDF para cada um.
        </p>

        <ul className="mt-3 space-y-2">
          {OPCOES.map((o) => (
            <li key={o.id}>
              <label className="flex items-center gap-3 rounded-md border border-border bg-background/50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={escolhidas.includes(o.id)}
                  onChange={() => alternar(o.id)}
                  className="size-4 accent-[oklch(0.7_0.19_45)]"
                />
                <span className="text-sm">{o.rotulo}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={gerando}
            onClick={() => exportar("conjunto")}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground disabled:opacity-60"
          >
            <FileDown className="size-4" /> EXPORTAR EM CONJUNTO (1 PDF)
          </button>
          <button
            type="button"
            disabled={gerando}
            onClick={() => exportar("separado")}
            className="flex items-center justify-center gap-2 rounded-md border border-primary px-4 py-3 font-display text-sm tracking-tight text-primary disabled:opacity-60"
          >
            <FileDown className="size-4" /> EXPORTAR SEPARADO (1 PDF PARA CADA)
          </button>
        </div>
      </section>
    </Casca>
  );
}
