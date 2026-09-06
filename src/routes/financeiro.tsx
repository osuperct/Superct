import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleDollarSign } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Mensalidades } from "@/components/Mensalidades";
import type { Mensalidade } from "@/lib/mensalidade";
import { planoDoContrato, type PlanoContrato } from "@/lib/planoContrato";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Matrículas e Mensalidades — Super CT" },
      {
        name: "description",
        content:
          "Controle das matrículas ativas e inativas, mensalidades recebidas e projeção do próximo mês do Super CT.",
      },
      { property: "og:title", content: "Matrículas e Mensalidades — Super CT" },
      {
        property: "og:description",
        content: "Controle financeiro das matrículas e mensalidades do Super CT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <Casca>
      <p className="text-sm text-muted-foreground">Não foi possível abrir a área financeira.</p>
    </Casca>
  ),
  component: FinanceiroPage,
});

type Alu = { id: string; nome: string; matricula: string | null; user_id: string };

function Casca({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-5 py-8">
        <Link to="/adm" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Área ADM
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-2xl leading-tight tracking-tighter">
          <CircleDollarSign className="size-6 shrink-0 text-primary" />
          <span>
            MATRÍCULAS E <span className="text-primary">MENSALIDADES</span>
          </span>
        </h1>
        <div className="mt-6 space-y-6">{children}</div>
      </main>
    </div>
  );
}

function FinanceiroPage() {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [alunos, setAlunos] = useState<Alu[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [planos, setPlanos] = useState<PlanoContrato[]>([]);

  const carregar = useCallback(async () => {
    const { data: papeis } = await supabase.from("user_roles").select("role");
    const ehProfessor = (papeis ?? []).some((p) => p.role === "professor");
    setAutorizado(ehProfessor);
    if (!ehProfessor) return;

    // Liga contratos assinados que ficaram sem aluno cadastrado.
    await supabase.rpc("vincular_alunos_dos_contratos");

    const [{ data: a }, { data: m }, { data: f }, { data: docs }] = await Promise.all([
      supabase.from("alunos").select("id, nome, matricula, user_id").order("nome"),
      supabase
        .from("mensalidades")
        .select("id, aluno_id, user_id, referencia, ativo, valor, pago, pago_em, forma"),
      supabase
        .from("fichas")
        .select("aluno_id, dados, created_at")
        .eq("tipo", "contrato")
        .order("created_at", { ascending: false }),
      supabase.from("documentos").select("aluno_id, tipo, liberado").eq("tipo", "contrato"),
    ]);
    setAlunos((a ?? []) as Alu[]);
    setMensalidades((m ?? []) as Mensalidade[]);

    // Só entram na lista os alunos cujo contrato já foi conferido e liberado.
    const conferidos = new Set(
      (docs ?? []).filter((d) => d.liberado && d.aluno_id).map((d) => d.aluno_id as string),
    );
    const vistos = new Set<string>();
    const lista: PlanoContrato[] = [];
    for (const ficha of f ?? []) {
      const alunoId = ficha.aluno_id;
      if (!alunoId || vistos.has(alunoId) || !conferidos.has(alunoId)) continue;
      vistos.add(alunoId);
      lista.push(planoDoContrato(alunoId, (ficha.dados ?? {}) as Record<string, unknown>));
    }
    setPlanos(lista);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

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
          Esta área é exclusiva do professor. Entre com a conta do Super CT para acessar.
        </p>
        <Link
          to="/conta"
          className="inline-block rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground"
        >
          FAZER LOGIN
        </Link>
      </Casca>
    );

  return (
    <Casca>
      <Mensalidades
        alunos={alunos}
        mensalidades={mensalidades}
        planos={planos}
        recarregar={() => void carregar()}
      />
    </Casca>
  );
}
