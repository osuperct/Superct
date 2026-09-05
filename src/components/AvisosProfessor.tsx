import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Megaphone, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { type Aviso, agruparPorMes, dataCurta, enviarAviso, excluirAviso, listarAvisos, mesAtual } from "@/lib/avisos";

export function AvisosProfessor({ uid }: { uid: string }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [imagem, setImagem] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set([mesAtual()]));

  function escolherImagem(file: File | null) {
    if (previa) URL.revokeObjectURL(previa);
    setImagem(file);
    setPrevia(file ? URL.createObjectURL(file) : null);
  }

  const carregar = useCallback(async () => {
    setLista(await listarAvisos());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar() {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error("Escreva o título e a mensagem do aviso.");
      return;
    }
    setEnviando(true);
    try {
      await enviarAviso(uid, titulo, mensagem, imagem);
      setTitulo("");
      setMensagem("");
      escolherImagem(null);
      await carregar();
      toast.success("Aviso enviado para todos os responsáveis.");
    } catch {
      toast.error("Não foi possível enviar o aviso.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    try {
      await excluirAviso(id);
      setLista((atual) => atual.filter((a) => a.id !== id));
    } catch {
      toast.error("Não foi possível excluir o aviso.");
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <Megaphone className="size-4 text-primary" /> QUADRO DE AVISOS
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        A mensagem aparece na área de todos os responsáveis e chega como notificação no celular.
      </p>

      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título do aviso"
        maxLength={80}
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder="Escreva a mensagem para os responsáveis"
        rows={4}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="mt-2 flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-display text-xs tracking-tight text-muted-foreground">
          <ImagePlus className="size-4" /> {imagem ? "TROCAR FOTO" : "ANEXAR FOTO"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => escolherImagem(e.target.files?.[0] ?? null)}
          />
        </label>
        {previa && (
          <button
            type="button"
            onClick={() => escolherImagem(null)}
            aria-label="Remover foto"
            className="shrink-0 rounded-md border border-border p-2 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {previa && (
        <img
          src={previa}
          alt="Prévia da foto do aviso"
          className="mt-2 max-h-48 w-full rounded-md border border-border object-contain"
        />
      )}

      <button
        type="button"
        disabled={enviando}
        onClick={() => void enviar()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground disabled:opacity-60"
      >
        {enviando ? "ENVIANDO..." : "ENVIAR AVISO PARA TODOS"} <Send className="size-4 shrink-0" />
      </button>

      {lista.length > 0 && (
        <ul className="mt-3 space-y-2">
          {lista.map((a) => (
            <li key={a.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-sm tracking-tight">{a.titulo}</p>
                <button
                  type="button"
                  onClick={() => void remover(a.id)}
                  aria-label="Excluir aviso"
                  className="shrink-0 rounded-md border border-border p-1 text-muted-foreground"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.mensagem}</p>
              {a.imagem && (
                <img
                  src={a.imagem}
                  alt={`Foto do aviso ${a.titulo}`}
                  loading="lazy"
                  className="mt-2 max-h-56 w-full rounded-md border border-border object-contain"
                />
              )}
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {dataCurta(a.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
