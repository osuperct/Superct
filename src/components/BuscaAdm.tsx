import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, User } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatarDataIso, formatarValor, mesExtensoRef } from "@/lib/mensalidade";
import { lerNotas, mediaNotas, mesExtenso } from "@/lib/avaliacao";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { linkWhats } from "@/components/PainelDia";

type Aluno = { id: string; nome: string; idade: number | null; matricula: string | null; user_id: string; nascimento: string | null };
type Perfil = { id: string; nome_responsavel: string | null; telefone: string | null; cpf: string | null; bloqueado_em: string | null; endereco: string | null };

const DESC: Record<string, string> = { contrato: "Contrato", ficha: "Ficha / PAR-Q", comprovante: "Comprovante", documento: "Documento", outro: "Outro" };

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function BuscaAdm() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [perfis, setPerfis] = useState<Record<string, Perfil>>({});
  const [termo, setTermo] = useState("");
  const [sel, setSel] = useState<Aluno | null>(null);

  useEffect(() => {
    void Promise.all([
      supabase.from("alunos").select("id, nome, idade, matricula, user_id, nascimento").order("nome"),
      supabase.from("perfis").select("id, nome_responsavel, telefone, cpf, bloqueado_em, endereco"),
    ]).then(([{ data: a }, { data: p }]) => {
      setAlunos((a ?? []) as Aluno[]);
      setPerfis(Object.fromEntries(((p ?? []) as Perfil[]).map((x) => [x.id, x])));
    });
  }, []);

  const resultados = useMemo(() => {
    const t = semAcento(termo.trim());
    if (t.length < 2) return [];
    const digitos = t.replace(/\D+/g, "");
    return alunos
      .filter((a) => {
        const p = perfis[a.user_id];
        return (
          semAcento(a.nome).includes(t) ||
          semAcento(p?.nome_responsavel ?? "").includes(t) ||
          (digitos.length >= 3 && ((p?.telefone ?? "").replace(/\D+/g, "").includes(digitos) || (p?.cpf ?? "").replace(/\D+/g, "").includes(digitos)))
        );
      })
      .slice(0, 12);
  }, [termo, alunos, perfis]);

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <Search className="size-4 text-primary" /> BUSCA GERAL
      </h2>
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Nome do aluno, responsável, telefone ou CPF"
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {resultados.length > 0 && (
        <ul className="mt-2 space-y-1">
          {resultados.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => setSel(a)} className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left hover:border-primary">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{a.nome}</span>
                  <span className="block truncate font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Resp.: {perfis[a.user_id]?.nome_responsavel ?? "—"}{perfis[a.user_id]?.bloqueado_em ? " • BLOQUEADO" : ""}
                  </span>
                </span>
                <User className="size-4 shrink-0 text-primary" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {termo.trim().length >= 2 && resultados.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Ninguém encontrado.</p>}
      <FichaAluno aluno={sel} perfil={sel ? perfis[sel.user_id] : undefined} fechar={() => setSel(null)} />
    </section>
  );
}

type Dados = {
  docs: { id: string; tipo: string; nome_arquivo: string; caminho: string; created_at: string }[];
  mens: { referencia: string; valor: number | null; pago: boolean | null; pago_em: string | null; forma: string | null }[];
  avals: { referencia: string; notas: unknown; publicada: boolean | null }[];
  presencasMes: number;
  renov: { plano: string | null; status: string; inicio: string | null; fim: string | null }[];
};

function FichaAluno({ aluno, perfil, fechar }: { aluno: Aluno | null; perfil: Perfil | undefined; fechar: () => void }) {
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    setDados(null);
    if (!aluno) return;
    const d = new Date();
    const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    void Promise.all([
      supabase.from("documentos").select("id, tipo, nome_arquivo, caminho, created_at").eq("aluno_id", aluno.id).order("created_at", { ascending: false }),
      supabase.from("mensalidades").select("referencia, valor, pago, pago_em, forma").eq("aluno_id", aluno.id).order("referencia", { ascending: false }),
      supabase.from("avaliacoes").select("referencia, notas, publicada").eq("aluno_id", aluno.id).order("referencia", { ascending: false }),
      supabase.from("presencas").select("id", { count: "exact", head: true }).eq("aluno_id", aluno.id).gte("dia", inicio),
      supabase.from("renovacoes_contrato").select("plano, status, inicio, fim").eq("aluno_id", aluno.id).order("created_at", { ascending: false }),
    ]).then(([docs, mens, avals, pres, renov]) =>
      setDados({
        docs: (docs.data ?? []) as Dados["docs"],
        mens: (mens.data ?? []) as Dados["mens"],
        avals: (avals.data ?? []) as Dados["avals"],
        presencasMes: pres.count ?? 0,
        renov: (renov.data ?? []) as Dados["renov"],
      }),
    );
  }, [aluno]);

  async function abrir(caminho: string) {
    const { data } = await supabase.storage.from("documentos-alunos").createSignedUrl(caminho, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Não foi possível abrir o arquivo.");
  }

  const titulo = "mt-4 font-mono text-[10px] uppercase tracking-widest text-primary";

  return (
    <Dialog open={!!aluno} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{aluno?.nome}</DialogTitle></DialogHeader>
        {aluno && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">
              {aluno.idade ? `${aluno.idade} anos` : ""}{aluno.matricula ? ` • Matrícula ${aluno.matricula}` : ""}
              {perfil?.bloqueado_em ? " • CADASTRO BLOQUEADO" : ""}
            </p>
            <p className={titulo}>Responsável</p>
            <p>{perfil?.nome_responsavel ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{perfil?.telefone ?? ""}{perfil?.cpf ? ` • CPF ${perfil.cpf}` : ""}</p>
            {perfil?.endereco && <p className="text-xs text-muted-foreground">{perfil.endereco}</p>}
            {perfil?.telefone && (
              <a target="_blank" rel="noopener noreferrer" href={linkWhats(perfil.telefone, "Olá! Aqui é do Super CT 💪 ")} className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 font-display text-xs text-primary-foreground">
                <MessageCircle className="size-3" /> WHATSAPP
              </a>
            )}

            {!dados && <p className="mt-4 text-xs text-muted-foreground">Carregando…</p>}
            {dados && (
              <>
                <p className={titulo}>Frequência</p>
                <p>{dados.presencasMes} presença(s) neste mês</p>

                <p className={titulo}>Documentos ({dados.docs.length})</p>
                {dados.docs.length === 0 && <p className="text-xs text-muted-foreground">Nenhum documento.</p>}
                <ul className="space-y-1">
                  {dados.docs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{DESC[d.tipo] ?? d.tipo} • {new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
                      <button type="button" onClick={() => void abrir(d.caminho)} className="rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase">Ver</button>
                    </li>
                  ))}
                </ul>

                <p className={titulo}>Mensalidades</p>
                {dados.mens.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma lançada.</p>}
                <ul className="space-y-1">
                  {dados.mens.slice(0, 12).map((m) => (
                    <li key={m.referencia} className="flex justify-between gap-2 text-xs">
                      <span className="capitalize">{mesExtensoRef(m.referencia)}</span>
                      <span className={m.pago ? "text-primary" : "text-accent-red"}>
                        {formatarValor(m.valor)} • {m.pago ? `pago ${formatarDataIso(m.pago_em)}` : "em aberto"}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className={titulo}>Avaliações</p>
                {dados.avals.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma avaliação.</p>}
                <ul className="space-y-1">
                  {dados.avals.slice(0, 6).map((a) => (
                    <li key={a.referencia} className="flex justify-between text-xs">
                      <span className="capitalize">{mesExtenso(a.referencia)}</span>
                      <span>média {mediaNotas(lerNotas(a.notas)).toFixed(1)}{a.publicada ? "" : " • rascunho"}</span>
                    </li>
                  ))}
                </ul>

                {dados.renov.length > 0 && (
                  <>
                    <p className={titulo}>Renovações</p>
                    <ul className="space-y-1">
                      {dados.renov.map((r, i) => (
                        <li key={i} className="text-xs">
                          {r.plano} • {r.status.toUpperCase()} • {formatarDataIso(r.inicio)} → {formatarDataIso(r.fim)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
