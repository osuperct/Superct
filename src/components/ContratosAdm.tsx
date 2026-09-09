import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FileSignature } from "lucide-react";
import { toast } from "sonner";

import { CAMPOS_CONTRATO } from "@/lib/documentos";
import { editarContrato, listarContratos, type ContratoAdm } from "@/lib/adm";

/** Campos que a administração pode corrigir (os fixos do contrato ficam de fora). */
const EDITAVEIS = CAMPOS_CONTRATO.filter((c) => !c.fixo);

function Campo({
  chave,
  rotulo,
  opcoes,
  longo,
  valor,
  onChange,
}: {
  chave: string;
  rotulo: string;
  opcoes?: string[] | undefined;
  longo?: boolean | undefined;
  valor: string;
  onChange: (v: string) => void;
}) {
  const lista = opcoes ? (valor && !opcoes.includes(valor) ? [...opcoes, valor] : opcoes) : null;
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{rotulo}</span>
      {lista ? (
        <select
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 max-w-full truncate rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">Não informado</option>
          {lista.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : longo ? (
        <textarea
          rows={3}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      ) : (
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
        />
      )}
      {lista && chave === "valor" ? (
        <input
          type="text"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ou digite o valor combinado (ex.: Outro valor — R$ 170,00)"
          className="mt-1 w-full rounded-md border border-dashed border-border bg-background/60 px-3 py-2 text-xs outline-none focus:border-primary"
        />
      ) : null}
    </label>
  );
}

export function ContratosAdm() {
  const [contratos, setContratos] = useState<ContratoAdm[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setContratos(await listarContratos());
    } catch {
      setContratos([]);
    }
  }, []);

  useEffect(() => {
    if (aberto && contratos === null) void carregar();
  }, [aberto, contratos, carregar]);

  function abrirEdicao(c: ContratoAdm) {
    if (editando === c.id) {
      setEditando("");
      return;
    }
    setEditando(c.id);
    const inicial: Record<string, string> = {};
    for (const campo of EDITAVEIS) {
      if (campo.multiplos) {
        for (const m of campo.multiplos) inicial[m.chave] = String(c.dados[m.chave] ?? "");
      } else {
        inicial[campo.chave] = String(c.dados[campo.chave] ?? "");
      }
    }
    setForm(inicial);
  }

  async function salvar(c: ContratoAdm) {
    setSalvando(true);
    const r = await editarContrato(c.id, form);
    setSalvando(false);
    if (!r.ok) {
      toast.error(r.erro);
      return;
    }
    toast.success("Contrato corrigido. O financeiro já usa os novos dados.");
    setEditando("");
    setContratos(null);
    await carregar();
  }

  const t = busca.trim().toLowerCase();
  const filtrados = (contratos ?? []).filter(
    (c) => !t || c.aluno.toLowerCase().includes(t) || c.responsavel.toLowerCase().includes(t),
  );

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <FileSignature className="size-4 text-primary" /> CORRIGIR CONTRATOS
        </h2>
        {aberto ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-primary" />}
      </button>
      <p className="mt-1 text-xs text-muted-foreground">
        Ajuste o plano escolhido, o valor da mensalidade, o vencimento e os demais dados quando o responsável
        preencher errado.
      </p>

      {aberto ? (
        contratos === null ? (
          <p className="mt-3 text-xs text-muted-foreground">Carregando contratos…</p>
        ) : (
          <>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por aluno ou responsável"
              className="mt-3 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <ul className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {filtrados.map((c) => (
                <li key={c.id} className="rounded-md border border-border bg-background/60 p-3">
                  <p className="font-display text-sm tracking-tight">{c.aluno || "(aluno não informado)"}</p>
                  <p className="text-xs text-muted-foreground">
                    Responsável: {c.responsavel || "—"}
                    {c.criadoEm ? ` • ${new Date(c.criadoEm).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                    {c.dados["valor"] || "sem plano"} • venc. {c.dados["vencimento"] || "—"}
                  </p>
                  <button
                    type="button"
                    onClick={() => abrirEdicao(c)}
                    className="mt-2 rounded-md border border-primary px-3 py-1.5 font-display text-[11px] tracking-tight text-primary"
                  >
                    {editando === c.id ? "FECHAR" : "EDITAR DADOS DO CONTRATO"}
                  </button>

                  {editando === c.id ? (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {EDITAVEIS.map((campo) =>
                        campo.multiplos ? (
                          campo.multiplos.map((m) => (
                            <Campo
                              key={m.chave}
                              chave={m.chave}
                              rotulo={`${campo.rotulo} — ${m.rotulo}`}
                              opcoes={m.opcoes}
                              valor={form[m.chave] ?? ""}
                              onChange={(v) => setForm((f) => ({ ...f, [m.chave]: v }))}
                            />
                          ))
                        ) : (
                          <Campo
                            key={campo.chave}
                            chave={campo.chave}
                            rotulo={campo.rotulo}
                            opcoes={campo.opcoes}
                            longo={campo.longo}
                            valor={form[campo.chave] ?? ""}
                            onChange={(v) => setForm((f) => ({ ...f, [campo.chave]: v }))}
                          />
                        ),
                      )}
                      <button
                        type="button"
                        disabled={salvando}
                        onClick={() => void salvar(c)}
                        className="w-full rounded-md bg-primary px-4 py-2 font-display text-xs tracking-tight text-primary-foreground disabled:opacity-60"
                      >
                        {salvando ? "SALVANDO…" : "SALVAR CORREÇÕES"}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
              {filtrados.length === 0 && (
                <li className="text-xs text-muted-foreground">Nenhum contrato encontrado.</li>
              )}
            </ul>
          </>
        )
      ) : null}
    </section>
  );
}
