import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — Super CT" },
      {
        name: "description",
        content: "Defina uma nova senha para entrar na área do responsável do Super CT.",
      },
      { property: "og:title", content: "Criar nova senha — Super CT" },
      { property: "og:description", content: "Redefinição de senha da área do responsável do Super CT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) setPronto(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
      else
        setAviso(
          "Abra esta página pelo link que chegou no seu e-mail. Se o link expirou, peça um novo na tela de entrada.",
        );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      setAviso("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== repetir) {
      setAviso("As duas senhas não são iguais.");
      return;
    }
    setOcupado(true);
    setAviso(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) {
      setAviso(error.message);
      return;
    }
    toast.success("Senha atualizada! Você já está na sua área.");
    void navigate({ to: "/conta" });
  }

  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-sm px-5 py-10">
        <Link to="/conta" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Área do responsável
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl tracking-tighter">
          <KeyRound className="size-6 text-primary" /> NOVA <span className="text-primary">SENHA</span>
        </h1>

        <form onSubmit={salvar} className="mt-6 space-y-3">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Nova senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              maxLength={72}
              required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Repita a nova senha
            </span>
            <input
              type="password"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              maxLength={72}
              required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          {aviso && <p className="text-xs text-primary">{aviso}</p>}

          <button
            type="submit"
            disabled={ocupado || !pronto}
            className="w-full rounded-md bg-primary px-4 py-3 font-display tracking-tight text-primary-foreground disabled:opacity-60"
          >
            {ocupado ? "SALVANDO…" : "SALVAR NOVA SENHA"}
          </button>
        </form>
      </main>
    </div>
  );
}
