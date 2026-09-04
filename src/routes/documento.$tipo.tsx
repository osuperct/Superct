import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { Download, FileText, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Assinatura } from "@/components/Assinatura";
import { gerarDocumentoPdf } from "@/lib/documentoPdf";
import { BUCKET, DOCS, EMAIL_SUPER_CT, TERMO_IMAGEM, type TipoDoc } from "@/lib/documentos";

export const Route = createFileRoute("/documento/$tipo")({
  params: {
    parse: ({ tipo }) => {
      if (tipo !== "ficha" && tipo !== "contrato") throw notFound();
      return { tipo: tipo as TipoDoc };
    },
    stringify: ({ tipo }) => ({ tipo }),
  },
  head: ({ params }) => {
    const doc = DOCS[params.tipo as TipoDoc] ?? DOCS.ficha;
    return {
      meta: [
        { title: `${doc.titulo} online — Super CT` },
        { name: "description", content: `Preencha e assine online o(a) ${doc.titulo.toLowerCase()} do Super CT pelo celular.` },
        { property: "og:title", content: `${doc.titulo} online — Super CT` },
        { property: "og:description", content: doc.subtitulo },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => (
    <Aviso texto="Não foi possível abrir este documento. Volte para a área do responsável e tente de novo." />
  ),
  notFoundComponent: () => <Aviso texto="Documento não encontrado." />,
  component: DocumentoPage,
});

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-sm px-5 py-12">
        <p className="text-sm text-muted-foreground">{texto}</p>
        <Link to="/conta" className="mt-4 inline-block font-mono text-[10px] uppercase tracking-widest text-primary">
          ← Área do responsável
        </Link>
      </main>
    </div>
  );
}

function DocumentoPage() {
  const { tipo } = Route.useParams();
  const doc = DOCS[tipo];
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
      <main className="mx-auto max-w-screen-sm px-5 py-8">
        <Link to="/conta" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Área do responsável
        </Link>
        <h1 className="mt-3 flex items-start gap-2 font-display text-2xl leading-tight tracking-tighter">
          <FileText className="mt-1 size-5 shrink-0 text-primary" />
          <span>
            {doc.titulo.toUpperCase().split(" ")[0]}{" "}
            <span className="text-primary">{doc.titulo.toUpperCase().split(" ").slice(1).join(" ")}</span>
          </span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{doc.subtitulo}</p>

        {carregando ? (
          <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>
        ) : session ? (
          <Formulario tipo={tipo} session={session} />
        ) : (
          <Aviso texto="Entre na sua conta para preencher e assinar este documento." />
        )}
      </main>
    </div>
  );
}

function Formulario({ tipo, session }: { tipo: TipoDoc; session: Session }) {
  const doc = DOCS[tipo];
  const uid = session.user.id;
  const emailResponsavel = session.user.email ?? "";
  const rascunhoKey = `superct_rascunho_${tipo}`;

  const valoresFixos = Object.fromEntries(
    doc.campos.filter((c) => c.fixo !== undefined).map((c) => [c.chave, c.fixo as string]),
  );

  const [valores, setValores] = useState<Record<string, string>>(valoresFixos);
  const [aceite, setAceite] = useState(false);
  const [aceiteClausulas, setAceiteClausulas] = useState(false);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [pdfPronto, setPdfPronto] = useState<{ url: string; nome: string } | null>(null);

  useEffect(() => {
    const bruto = localStorage.getItem(rascunhoKey);
    if (bruto) {
      try {
        const salvo = JSON.parse(bruto) as Record<string, string>;
        setValores({ ...valoresFixos, ...salvo });
      } catch {
        /* rascunho inválido */
      }
    }
  }, [rascunhoKey]);

  function set(chave: string, v: string) {
    setValores((atual) => {
      const prox = { ...atual, [chave]: v };
      localStorage.setItem(rascunhoKey, JSON.stringify(prox));
      return prox;
    });
  }

  function valorCampo(c: typeof doc.campos[number]) {
    if (c.fixo !== undefined) return c.fixo;
    if (c.multiplos) {
      const partes = c.multiplos.map((m) => valores[m.chave]).filter(Boolean);
      return partes.join(" — ");
    }
    return valores[c.chave] ?? "";
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!aceite) {
      toast.error("Confirme o termo de uso de imagem e a veracidade das informações.");
      return;
    }
    if (!assinatura) {
      toast.error("Assine no quadro com a canetinha antes de salvar.");
      return;
    }
    setOcupado(true);
    const nomeAssinante = valores["responsavel_nome"] ?? valores["contratante"] ?? "";

    try {
      const { error: erroFicha } = await supabase.from("fichas").insert({
        user_id: uid,
        tipo,
        dados: { ...valores, aceite_imagem: true, assinado_online: true, email_responsavel: emailResponsavel },
        enviado_em: new Date().toISOString(),
      });
      if (erroFicha) throw erroFicha;

      const linhas = doc.campos.map((c) => ({ rotulo: c.rotulo, valor: valorCampo(c) }));
      const blob = gerarDocumentoPdf({
        titulo: doc.titulo,
        linhas,
        termo: TERMO_IMAGEM,
        assinaturaDataUrl: assinatura,
        nomeAssinante,
      });
      const nomeArquivo = `${doc.arquivo}-assinado-${new Date().toISOString().slice(0, 10)}.pdf`;
      const caminho = `${uid}/${Date.now()}-${nomeArquivo}`;
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, { contentType: "application/pdf" });
      if (erroUpload) throw erroUpload;

      const { error: erroDoc } = await supabase.from("documentos").insert({
        user_id: uid,
        tipo,
        nome_arquivo: nomeArquivo,
        caminho,
      });
      if (erroDoc) throw erroDoc;

      localStorage.removeItem(rascunhoKey);
      setPdfPronto({ url: URL.createObjectURL(blob), nome: nomeArquivo });
      toast.success("Documento assinado e arquivado nos documentos do aluno!");
    } catch {
      toast.error("Não foi possível salvar o documento.");
    } finally {
      setOcupado(false);
    }
  }

  function enviarEmail() {
    const linhas = doc.campos.map((c) => `${c.rotulo}: ${valorCampo(c) || "-"}`);
    const corpo = [
      `${doc.titulo.toUpperCase()} — SUPER CT`,
      "",
      ...linhas,
      "",
      "TERMO DE USO DE IMAGEM (aceito e assinado on-line):",
      TERMO_IMAGEM,
      "",
      `Assinado on-line em ${new Date().toLocaleString("pt-BR")}.`,
      `O PDF assinado está guardado na área do responsável: ${window.location.origin}/conta`,
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(emailResponsavel)}?cc=${encodeURIComponent(
      EMAIL_SUPER_CT,
    )}&subject=${encodeURIComponent(`${doc.titulo} assinado`)}&body=${encodeURIComponent(corpo)}`;
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-3">
      <p className="rounded-md border border-border bg-card/40 p-3 text-xs text-muted-foreground">
        Preencha os espaços em branco digitando pelo celular, assine com a canetinha no quadro do fim da
        página e salve: o PDF assinado fica arquivado nos documentos do aluno.
      </p>

      {doc.campos.map((c) => {
        if (c.fixo !== undefined) {
          return (
            <label key={c.chave} className="block">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{c.rotulo}</span>
              <input
                value={c.fixo}
                readOnly
                disabled
                className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground outline-none"
              />
            </label>
          );
        }

        if (c.multiplos) {
          const partes = c.multiplos.map((m) => valores[m.chave] ?? "");
          const completo = partes.every(Boolean) ? partes.join(" — ") : "";
          return (
            <div key={c.chave} className="block">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{c.rotulo}</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {c.multiplos.map((m) => (
                  <label key={m.chave} className="block">
                    <span className="text-[10px] text-muted-foreground">{m.rotulo}</span>
                    <select
                      value={valores[m.chave] ?? ""}
                      onChange={(e) => set(m.chave, e.target.value)}
                      className="mt-1 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">Selecione</option>
                      {m.opcoes.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <input type="hidden" name={c.chave} value={completo} />
              {completo ? (
                <p className="mt-1 text-[10px] text-primary">{completo}</p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">Escolha os dias e o horário.</p>
              )}
            </div>
          );
        }

        if (c.opcoes) {
          return (
            <label key={c.chave} className="block">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{c.rotulo}</span>
              <select
                value={valores[c.chave] ?? ""}
                onChange={(e) => set(c.chave, e.target.value)}
                className="mt-1 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Selecione</option>
                {c.opcoes.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        return c.longo ? (
          <label key={c.chave} className="block">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{c.rotulo}</span>
            <textarea
              value={valores[c.chave] ?? ""}
              onChange={(e) => set(c.chave, e.target.value)}
              maxLength={600}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        ) : (
          <label key={c.chave} className="block">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{c.rotulo}</span>
            <input
              value={valores[c.chave] ?? ""}
              onChange={(e) => set(c.chave, e.target.value)}
              maxLength={300}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        );
      })}

      <label className="flex gap-3 rounded-md border border-border bg-card/50 p-3 text-xs leading-relaxed">
        <input
          type="checkbox"
          checked={aceite}
          onChange={(e) => setAceite(e.target.checked)}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>
          Declaro que as informações são verdadeiras e autorizo o uso de imagem do(a) aluno(a) conforme o termo:{" "}
          {TERMO_IMAGEM}
        </span>
      </label>

      <Assinatura onChange={setAssinatura} />

      <button
        type="submit"
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display tracking-tight text-primary-foreground disabled:opacity-60"
      >
        <Save className="size-4" /> {ocupado ? "SALVANDO…" : "ASSINAR E SALVAR NOS DOCUMENTOS"}
      </button>

      {pdfPronto && (
        <div className="space-y-2 rounded-md border border-primary/60 bg-primary/10 p-3">
          <p className="text-xs">
            Documento assinado e arquivado nos documentos do aluno. Você pode baixar o PDF ou enviar uma cópia
            por e-mail.
          </p>
          <a
            href={pdfPronto.url}
            download={pdfPronto.nome}
            className="flex items-center justify-center gap-2 rounded-md border border-primary px-4 py-2 font-display text-xs tracking-tight text-primary"
          >
            <Download className="size-4" /> BAIXAR PDF ASSINADO
          </a>
          <button
            type="button"
            onClick={enviarEmail}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 font-display text-xs tracking-tight text-muted-foreground"
          >
            <Send className="size-4" /> ENVIAR CÓPIA POR E-MAIL
          </button>
          <Link
            to="/conta"
            className="block rounded-md bg-primary px-4 py-2 text-center font-display text-xs tracking-tight text-primary-foreground"
          >
            VER MEUS DOCUMENTOS
          </Link>
        </div>
      )}
    </form>
  );
}
