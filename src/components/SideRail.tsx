import { Link } from "@tanstack/react-router";
import { Home, Gamepad2, Skull } from "lucide-react";

const itens = [
  { to: "/", label: "Início", icon: Home },
  { to: "/jogo", label: "Jogo", icon: Gamepad2 },
  { to: "/viloes", label: "Vilões", icon: Skull },
] as const;

export function SideRail() {
  return (
    <aside className="fixed left-0 top-1/2 z-[60] -translate-y-1/2">
      <nav className="flex flex-col gap-1 rounded-r-lg border border-l-0 border-border bg-background/70 py-2 pl-1 pr-1.5 backdrop-blur-md">
        {itens.map((item) => (
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
      </nav>
    </aside>
  );
}
