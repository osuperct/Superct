import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";

import { DIAS_SEMANA, MESES, diaExtenso, marcacoesDoAno } from "@/lib/feriados";
import { listarTurmas, type Turma } from "@/lib/turmas";
import { assetUrl } from "@/lib/assetUrl";
import mascoteMenino from "@/assets/mascote-menino.jpg.asset.json";
import mascoteMenina from "@/assets/mascote-menina.jpg.asset.json";

const turmasPadrao = [
  { turma: "1", horario: "08:30 às 10:30", idade: "04 a 12 anos", dias: "Segunda a sexta" },
  { turma: "2", horario: "15:45 às 17:45", idade: "07 a 14 anos", dias: "Segunda a sexta" },
  { turma: "3", horario: "17:45 às 18:45", idade: "04 a 07 anos", dias: "Segunda a quinta" },
  { turma: "4", horario: "18:45 às 19:45", idade: "08 a 14 anos", dias: "Segunda a quinta" },
];

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário do Ano — Super CT" },
      {
        name: "description",
        content:
          "Calendário do Super CT com o mês vigente, feriados nacionais e locais marcados em laranja e os dias de recesso e emenda.",
      },
      { property: "og:title", content: "Calendário do Ano — Super CT" },
      {
        property: "og:description",
        content: "Veja os feriados, emendas e recessos do Super CT mês a mês.",
      },
    ],
  }),
  component: CalendarioPage,
});

function CalendarioPage() {
  const hoje = new Date();
  const anoVigente = hoje.getFullYear();
  const [ano, setAno] = useState(anoVigente);
  const [mes, setMes] = useState(hoje.getMonth());
  const [turmasApp, setTurmasApp] = useState<Turma[]>([]);

  useEffect(() => {
    void listarTurmas().then(setTurmasApp);
  }, []);

  const turmasLista = turmasApp.length > 0 ? turmasApp : turmasPadrao;

  const marcacoes = useMemo(() => marcacoesDoAno(ano), [ano]);
  const porData = useMemo(() => new Map(marcacoes.map((m) => [m.data, m])), [marcacoes]);

  const primeiroDia = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const celulas = [...Array(primeiroDia).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];

  const doMes = marcacoes.filter((m) => Number(m.data.slice(5, 7)) === mes + 1);
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(
    hoje.getDate(),
  ).padStart(2, "0")}`;

  function mover(passo: number) {
    const total = mes + passo;
    if (total < 0) {
      setMes(11);
      setAno(ano - 1);
    } else if (total > 11) {
      setMes(0);
      setAno(ano + 1);
    } else {
      setMes(total);
    }
  }

  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-5 py-10">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          ← Voltar
        </Link>

        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl tracking-tighter">
          <CalendarDays className="size-6 text-primary" />
          CALENDÁRIO <span className="text-primary">{ano}</span>
        </h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Mês vigente: {MESES[hoje.getMonth()]} de {anoVigente}
        </p>

        <section className="mt-6 rounded-lg border border-border bg-card/60 p-4">
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Mês anterior"
              className="rounded-md border border-border p-2 text-muted-foreground active:scale-95"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="text-center">
              <p className="font-display text-xl tracking-tight">{MESES[mes]}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{ano}</p>
            </div>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Próximo mês"
              className="rounded-md border border-border p-2 text-muted-foreground active:scale-95"
            >
              <ChevronRight className="size-4" />
            </button>
          </header>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} className="font-mono text-[9px] uppercase text-muted-foreground">
                {d}
              </span>
            ))}
            {celulas.map((dia, i) => {
              if (dia === null) return <span key={`v${i}`} />;
              const data = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const marca = porData.get(data);
              const ehHoje = data === hojeIso;
              return (
                <div
                  key={data}
                  aria-label={marca ? `${dia} — ${marca.nome}` : String(dia)}
                  className={[
                    "flex aspect-square flex-col items-center justify-center rounded-md text-sm",
                    marca?.tipo === "emenda"
                      ? "border border-primary/70 text-primary"
                      : marca
                        ? "bg-primary font-bold text-primary-foreground"
                        : "text-foreground/80",
                    ehHoje && !marca ? "border border-foreground/60" : "",
                  ].join(" ")}
                >
                  {dia}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="font-display text-lg tracking-tight">
            RECESSO E FERIADOS — {MESES[mes]?.toUpperCase()}
          </h2>
          {doMes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum feriado ou recesso neste mês.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {doMes.map((m) => (
                <li
                  key={m.data}
                  className="flex items-start gap-3 rounded-md border border-border bg-card/40 p-3"
                >
                  <span
                    className={
                      m.tipo === "emenda"
                        ? "mt-1 size-3 shrink-0 rounded-full border-2 border-primary"
                        : "mt-1 size-3 shrink-0 rounded-full bg-primary"
                    }
                  />
                  <div>
                    <p className="text-sm font-semibold">{m.nome}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {diaExtenso(m.data)} •{" "}
                      {m.tipo === "emenda"
                        ? "Recesso (emenda de feriado)"
                        : m.tipo === "local"
                          ? "Recesso — feriado local"
                          : "Recesso — feriado nacional"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 font-mono text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
            Dia laranja cheio = feriado • contorno laranja = emenda de feriado (feriado na terça ou na
            sexta, o dia anterior também é recesso)
          </p>
        </section>
      </main>
    </div>
  );
}
