import { useEffect, useState } from "react";
import { Bell, MessageCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { enviarPush, listarSemPush } from "@/lib/push.functions";

type SemPush = { id: string; nome: string; telefone: string };

/** Bloco da área do professor para mandar recado por notificação no celular. */
export function EnvioPush() {
  const enviar = useServerFn(enviarPush);
  const listar = useServerFn(listarSemPush);

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [link, setLink] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [semPush, setSemPush] = useState<SemPush[]>([]);

  const recarregar = () => {
    void listar({ data: undefined }).then(setSemPush).catch(() => setSemPush([]));
  };

  useEffect(recarregar, []);

  async function mandar() {
    if (titulo.trim().length < 2 || mensagem.trim().length < 2) {
      toast.error("Escreva o título e a mensagem.");
      return;
    }
    setOcupado(true);
    try {
      const r = await enviar({ data: { titulo, mensagem, link: link.trim() } });
      if (r.ok) {
        toast.success(`Notificação enviada para ${r.enviados} aparelho(s).`);
        setTitulo("");
        setMensagem("");
        setLink("");
      } else {
        toast.error(r.erro);
      }
    } catch {
      toast.error("Não foi possível enviar agora.");
    }
    setOcupado(false);
    recarregar();
  }

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <Bell className="size-4 text-primary" /> ENVIAR RECADO POR NOTIFICAÇÃO
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Vai para o celular dos responsáveis de alunos com matrícula ativa que já autorizaram as notificações.
      </p>
      <div className="mt-3 grid gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={80}
          placeholder="Título do recado"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Mensagem"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={300}
          placeholder="Link (opcional)"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={() => void mandar()}
          disabled={ocupado}
          className="rounded-md bg-primary px-4 py-2 font-display text-sm text-primary-foreground disabled:opacity-60"
        >
          {ocupado ? "ENVIANDO…" : "ENVIAR NOTIFICAÇÃO"}
        </button>
      </div>

      <div className="mt-4">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Sem notificação ativa ({semPush.length})
        </h3>
        <ul className="mt-2 max-h-[200px] space-y-2 overflow-y-auto">
          {semPush.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
              <span className="text-sm">
                {p.nome || "Responsável"}
                {p.telefone ? ` • ${p.telefone}` : ""}
              </span>
              {p.telefone && (
                <a
                  href={`https://wa.me/55${p.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    "Olá! Abra osuperct.com no celular, entre na sua conta e toque em ATIVAR NOTIFICAÇÕES para receber os recados do Super CT.",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 font-display text-xs text-primary-foreground"
                >
                  <MessageCircle className="size-3" /> AVISAR
                </a>
              )}
            </li>
          ))}
          {semPush.length === 0 && (
            <li className="text-sm text-muted-foreground">Todos os responsáveis ativos já estão recebendo.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
