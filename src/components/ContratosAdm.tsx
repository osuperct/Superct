import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FileSignature } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { acrescentarAdendoContrato, type CorrecaoContrato } from "@/lib/contratoAdendo";
import { BUCKET, CAMPOS_CONTRATO } from "@/lib/documentos";
import { editarContrato, listarContratos, type ContratoAdm } from "@/lib/adm";

type DocumentoContrato = {
  caminho: string;
  nome_arquivo: string;
  created_at: string;
  aluno_id: string | null;
};

function prioridadeDocumento(documento: DocumentoContrato): number {
  const nome = documento.nome_arquivo.toLowerCase();
  if (nome.includes("contrato-adendo")) return 3;
  if (nome.includes("assinado")) return 2;
  if (!nome.includes("contrato-corrigido")) return 1;
  return 0;
}

async function localizarContratoAssinado(c: ContratoAdm): Promise<DocumentoContrato> {
  const { data, error } = await supabase
    .from("documentos")
    .select("caminho, nome_arquivo, created_at, aluno_id")
    .eq("user_id", c.userId)
    .eq("tipo", "contrato")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const documentos = ((data ?? []) as DocumentoContrato[])
    .filter((d) => !c.alunoId || !d.aluno_id || d.aluno_id === c.alunoId)
    .sort((a, b) => prioridadeDocumento(b) - prioridadeDocumento(a));
  const contrato = documentos.find((d) => prioridadeDocumento(d) > 0);
  if (!contrato) throw new Error("Contrato assinado não encontrado nos documentos do aluno.");
  return contrato;
}

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
    const rotulos = new Map<string, string>();
    for (const campo of EDITAVEIS) {
      if (campo.multiplos) {
        for (const item of campo.multiplos) rotulos.set(item.chave, `${campo.rotulo} — ${item.rotulo}`);
      } else {
        rotulos.set(campo.chave, campo.rotulo);
      }
    }
    const correcoes = Object.entries(form)
      .filter(([chave, valor]) => String(c.dados[chave] ?? "").trim() !== valor.trim())
      .map(([chave, valor]) => ({
        rotulo: rotulos.get(chave) ?? chave,
        anterior: String(c.dados[chave] ?? ""),
        atualizado: valor,
      }));
    if (correcoes.length === 0) {
      toast.info("Nenhum dado foi alterado.");
      return;
    }

    setSalvando(true);
    let contratoComAdendo: Blob;
    try {
      const contrato = await localizarContratoAssinado(c);
      const { data: arquivo, error } = await supabase.storage.from(BUCKET).download(contrato.caminho);
      if (error || !arquivo) throw error ?? new Error("Contrato assinado não encontrado.");
      const tipoArquivo = arquivo.type || (contrato.nome_arquivo.toLowerCase().endsWith(".png") ? "image/png" :
        /\.jpe?g$/i.test(contrato.nome_arquivo) ? "image/jpeg" : "application/pdf");
      contratoComAdendo = await acrescentarAdendoContrato({
        arquivoOriginal: await arquivo.arrayBuffer(),
        tipoArquivo,
        aluno: c.aluno,
        responsavel: c.responsavel,
        correcoes,
        alteradoEm: new Date(),
      });
    } catch (erro) {
      setSalvando(false);
      toast.error(erro instanceof Error ? erro.message : "Não foi possível abrir o contrato assinado.");
      return;
    }

    const r = await editarContrato(c.id, form);
    if (!r.ok) {
      setSalvando(false);
      toast.error(r.erro);
      return;
    }
    try {
      const alteradoEm = new Date();
      const nomeArquivo = `contrato-adendo-${alteradoEm.toISOString().slice(0, 10)}.pdf`;
      const caminho = `${c.userId}/${alteradoEm.getTime()}-${nomeArquivo}`;
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, contratoComAdendo, { contentType: "application/pdf" });
      if (erroUpload) throw erroUpload;
      const { error } = await supabase.from("documentos").insert({
        user_id: c.userId,
        tipo: "contrato",
        ...(c.alunoId ? { aluno_id: c.alunoId } : {}),
        nome_arquivo: nomeArquivo,
        caminho,
        enviado_por_professor: true,
        liberado: true,
        oculto_responsavel: false,
      });
      if (error) throw error;
      toast.success("Contrato corrigido com a assinatura preservada e o adendo datado no final do documento.");
    } catch {
      toast.warning("Os dados foram corrigidos, mas não foi possível arquivar o adendo no contrato assinado.");
    }
    setSalvando(false);
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
