import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
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
  Handshake,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSidebarControl } from "./SidebarContext";
import { Button } from "@/components/ui/button";
import { ParceirosPublicos } from "./ParceirosPublicos";

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
  const router = useRouter();
  const { forcarRecolhida } = useSidebarControl();
  const [aberta, setAberta] = useState(true);
  const [recolhida, setRecolhida] = useState(false);
  const [professor, setProfessor] = useState(false);
  const [adm, setAdm] = useState(false);
  const [parceirosAbertos, setParceirosAbertos] = useState(false);
  const [avisosNaoLidos, setAvisosNaoLidos] = useState(0);
  const estaRecolhida = !aberta || forcarRecolhida;

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

  /** Conta os recados do Super CT que ainda não foram lidos. */
  const checarAvisos = useCallback(async () => {
    const { data: sessao } = await supabase.auth.getUser();
    const uid = sessao.user?.id;
    if (!uid) {
      setAvisosNaoLidos(0);
      return;
    }
    const [resAvisos, resLidos] = await Promise.all([
      supabase.from("avisos").select("id").order("created_at", { ascending: false }).limit(30),
      supabase.from("avisos_lidos").select("aviso_id").eq("user_id", uid),
    ]);
    const idsLidos = new Set(
      (resLidos.data ?? []).map((r) => (r as { aviso_id: string }).aviso_id),
    );
    setAvisosNaoLidos(
      (resAvisos.data ?? []).filter((a) => !idsLidos.has((a as { id: string }).id)).length,
    );
  }, []);

  useEffect(() => {
    void checarAvisos();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void checarAvisos());
    const canal = supabase
      .channel("avisos-badge-rail")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "avisos" }, () => {
        void checarAvisos();
      })
      .subscribe();
    const cancelar = router.subscribe("onResolved", () => void checarAvisos());
    return () => {
      sub.subscription.unsubscribe();
      cancelar();
      void supabase.removeChannel(canal);
    };
  }, [checarAvisos, router]);

  // Coloca o número no ícone do app na tela do celular, como no WhatsApp.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    try {
      if (avisosNaoLidos > 0) void nav.setAppBadge?.(avisosNaoLidos);
      else void nav.clearAppBadge?.();
    } catch {
      // Aparelho sem suporte ao selo numérico.
    }
  }, [avisosNaoLidos]);


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

  return (
    <>
    <ParceirosPublicos open={parceirosAbertos} onOpenChange={setParceirosAbertos} />
    {estaRecolhida ? (
      <button
        type="button"
        aria-label="Abrir menu lateral"
        onClick={() => {
          if (!forcarRecolhida) setAberta(true);
        }}
        className={`fixed left-0 top-16 z-[60] rounded-r-lg border border-l-0 border-border bg-background/80 py-6 pl-0.5 pr-1 text-primary backdrop-blur-md active:scale-95 md:top-1/2 md:-translate-y-1/2 ${
          forcarRecolhida ? "pointer-events-none opacity-0" : ""
        }`}
      >
        <ChevronRight className="size-4" />
      </button>
    ) : (
    <aside className="fixed left-0 top-16 z-[60] md:top-1/2 md:-translate-y-1/2">
      <nav
        className={`flex flex-col gap-1 rounded-r-lg border border-l-0 border-border bg-background/70 py-2 pl-1 pr-1.5 backdrop-blur-md transition-transform duration-300 ease-out ${
          recolhida ? "-translate-x-[calc(100%_-_10px)]" : "translate-x-0"
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
            className="relative flex w-12 flex-col items-center gap-0.5 rounded-md px-1 py-2 transition-colors active:scale-95"
          >
            <item.icon className="size-5" />
            <span className="font-mono text-[8px] uppercase">{item.label}</span>
            {item.to === "/conta" && avisosNaoLidos > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[8px] font-bold leading-none text-destructive-foreground">
                {avisosNaoLidos > 9 ? "9+" : avisosNaoLidos}
              </span>
            )}
          </Link>
        ))}
        <Button
          type="button"
          variant="ghost"
          aria-label="Parceiros"
          title="Parceiros do CT"
          onClick={() => { setParceirosAbertos(true); setAberta(false); }}
          className="flex h-auto w-12 flex-col items-center gap-0.5 rounded-md px-1 py-2 text-muted-foreground"
        >
          <Handshake className="size-5" />
          <span className="font-mono text-[8px] uppercase">Parceiros</span>
        </Button>
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
    )}
    </>
  );
}
