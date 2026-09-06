import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Home,
  Gamepad2,
  Skull,
  Shield,
  CalendarDays,
  UserRound,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const itens = [
  { to: "/", label: "Início", icon: Home },
  { to: "/conta", label: "Conta", icon: UserRound },
  { to: "/calendario", label: "Agenda", icon: CalendarDays },
  { to: "/loja", label: "Loja", icon: ShoppingBag },
  { to: "/jogo", label: "Jogo", icon: Gamepad2 },
  { to: "/herois", label: "Heróis", icon: Shield },
  { to: "/viloes", label: "Vilões", icon: Skull },
] as const;

export function SideRail() {
  const [aberta, setAberta] = useState(true);
  const [recolhida, setRecolhida] = useState(false);
  const [professor, setProfessor] = useState(false);
  const [adm, setAdm] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function checar() {
      const { data: sessao } = await supabase.auth.getUser();
      const uid = sessao.user?.id;
      if (!uid) {
        if (ativo) {
          setProfessor(false);
          setAdm(false);
        }
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (!ativo) return;
      setProfessor((data ?? []).some((p) => p.role === "professor"));
      setAdm((data ?? []).some((p) => p.role === "adm"));
    }
    void checar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void checar());
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!aberta) {
      setRecolhida(false);
      return;
    }

    function verificar() {
      const ids = ["cards-inicio", "horarios", "nosso-qg"];
      const margem = window.innerHeight * 0.1;
      const visivel = ids.some((id) => {
        const alvo = document.getElementById(id);
        if (!alvo) return false;
        const r = alvo.getBoundingClientRect();
        return r.top < window.innerHeight - margem && r.bottom > margem;
      });
      setRecolhida(visivel);
    }

    verificar();
    window.addEventListener("scroll", verificar, { passive: true });
    window.addEventListener("resize", verificar, { passive: true });
    return () => {
      window.removeEventListener("scroll", verificar);
      window.removeEventListener("resize", verificar);
    };
  }, [aberta]);

  const links = [
    ...itens,
    ...(professor ? [{ to: "/professor", label: "Professor", icon: GraduationCap } as const] : []),
    ...(adm ? [{ to: "/adm", label: "ADM", icon: ShieldCheck } as const] : []),
  ];

  if (!aberta) {
    return (
      <button
        type="button"
        aria-label="Abrir menu lateral"
        onClick={() => setAberta(true)}
        className="fixed left-0 top-1/2 z-[60] -translate-y-1/2 rounded-r-lg border border-l-0 border-border bg-background/80 py-6 pl-0.5 pr-1 text-primary backdrop-blur-md active:scale-95"
      >
        <ChevronRight className="size-4" />
      </button>
    );
  }

  return (
    <aside className="fixed left-0 top-1/2 z-[60] -translate-y-1/2">
      <nav
        className={`flex flex-col gap-1 rounded-r-lg border border-l-0 border-border bg-background/70 py-2 pl-1 pr-1.5 backdrop-blur-md transition-transform duration-300 ease-out ${
          recolhida ? "-translate-x-[calc(100%-10px)]" : "translate-x-0"
        }`}
      >
        {links.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "bg-primary text-primary-foreground" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="flex w-12 flex-col items-center gap-0.5 rounded-md px-1 py-2 transition-colors active:scale-95"
          >
            <item.icon className="size-5" />
            <span className="font-mono text-[8px] uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          aria-label="Recolher menu lateral"
          onClick={() => setAberta(false)}
          className="mt-1 flex w-12 items-center justify-center rounded-md border-t border-border py-1.5 text-muted-foreground active:scale-95"
        >
          <ChevronLeft className="size-4" />
        </button>
      </nav>
    </aside>
  );
}
