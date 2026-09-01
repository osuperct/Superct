import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import logoAsset from "@/assets/super-ct-logo.asset.json";

const logo = logoAsset.url;
import arena from "@/assets/IMG_20260901_175621.jpg.asset.json";
import escalada from "@/assets/IMG_20260901_175604.jpg.asset.json";
import argolas from "@/assets/IMG_20260901_175528.jpg.asset.json";
import circuitos from "@/assets/IMG_20260901_175513.jpg.asset.json";
import fachada from "@/assets/IMG_20260901_175731.jpg.asset.json";
import mascoteMenino from "@/assets/mascote-menino.jpg.asset.json";
import mascoteMenina from "@/assets/mascote-menina.jpg.asset.json";
import funcionalInfantilImg from "@/assets/funcional-infantil.png.asset.json";
import funcionalInfantilCover from "@/assets/funcional-infantil-cover.jpg";

const turmas = [
  { turma: "1", horario: "08:30 às 10:30", idade: "04 a 12 anos", dias: "Segunda a sexta" },
  { turma: "2", horario: "15:45 às 17:45", idade: "07 a 14 anos", dias: "Segunda a sexta" },
  { turma: "3", horario: "17:45 às 18:45", idade: "04 a 07 anos", dias: "Segunda a quinta" },
  { turma: "4", horario: "18:45 às 19:45", idade: "08 a 14 anos", dias: "Segunda a quinta" },
];

const WHATSAPP = "https://wa.me/5535988223596";

const TITLE = "Super CT — Treinamento Funcional Infantil em São Sebastião do Paraíso";
const DESCRIPTION =
  "Sua criança vira super! Treinamento funcional infantil, ginástica, esportes e circuitos com o Professor Tio Victor. Rua Geraldo Marcolini 1609, São Sebastião do Paraíso - MG.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const modalidades = [
  {
    nome: "FUNCIONAL INFANTIL",
    texto: "Força, coordenação e postura para o dia a dia.",
    imagem: funcionalInfantilCover,
    alt: "Caixa de madeira, corda naval e bolas de peso azul e rosa sobre tatame preto",
    destaque: true,
  },
  { nome: "GINÁSTICA", texto: "Base motora, equilíbrio e flexibilidade." },
  { nome: "ESPORTES", texto: "Iniciação esportiva com jogo e trabalho em equipe." },
  { nome: "PAREDE DE ESCALADA", texto: "Desafio vertical com total segurança." },
  { nome: "TREPA-TREPA & ARGOLAS", texto: "Domine a gravidade e o movimento." },
  { nome: "COLÔNIA DE FÉRIAS", texto: "Diversão máxima nas pausas escolares." },
];

const galeria = [
  { src: arena.url, legenda: "Arena Principal", alt: "Área de treino do Super CT com piso emborrachado e iluminação laranja" },
  { src: escalada.url, legenda: "Muro Ninja", alt: "Parede de escalada infantil com agarras coloridas" },
  { src: argolas.url, legenda: "Treino Aéreo", alt: "Argolas e estrutura de trepa-trepa do Super CT" },
  { src: circuitos.url, legenda: "Circuitos", alt: "Crianças em circuito de treino com escada de agilidade" },
  { src: fachada.url, legenda: "Nossa Fachada", alt: "Fachada do Super CT com logo na vitrine de vidro" },
];

function Index() {
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-md items-center justify-between">
          <div className="flex flex-col">
            <span className="font-display text-xl tracking-tighter text-primary">SUPER CT</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
              São Sebastião do Paraíso
            </span>
          </div>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm bg-primary px-4 py-2 font-display text-sm text-primary-foreground transition-transform active:scale-95"
          >
            TREINO GRÁTIS
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-screen-md">
        <section className="relative overflow-hidden px-6 pb-12 pt-24">
          <div className="absolute right-[-20px] top-20 rotate-12 opacity-20">
            <div className="animate-neon h-24 w-12 border-r-4 border-t-4 border-accent-red" />
          </div>

          <div className="animate-reveal [animation-delay:100ms]">
            <div className="mx-auto mb-4 h-48 w-64 overflow-hidden">
              <img
                src={logo}
                alt="Logo Super CT"
                width={1024}
                height={1536}
                className="h-full w-full object-cover"
                style={{ objectPosition: "center 30%" }}
              />
            </div>


            <h1 className="mb-4 text-pretty text-center font-display text-5xl uppercase leading-[0.9] tracking-tighter">
              SUA CRIANÇA VIRA <span className="text-primary italic">SUPER!</span>
            </h1>
            <p className="mx-auto max-w-[30ch] text-center text-sm text-muted-foreground">
              Treinamento funcional infantil, ginástica, esportes e circuitos com o Professor
              Tio Victor.
            </p>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="mb-8 flex items-center gap-2">
            <div className="h-[2px] w-8 bg-primary" />
            <h2 className="font-display text-2xl uppercase tracking-tight">MODALIDADES</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {modalidades.map((m, i) => {
              const Card = m.imagem ? "button" : "div";
              return (
                <Card
                  key={m.nome}
                  type={m.imagem ? "button" : undefined}
                  onClick={m.imagem ? () => setModalAberto(true) : undefined}
                  className={`animate-reveal relative overflow-hidden rounded-lg border border-border bg-surface p-4 text-left transition-transform active:scale-[0.98] ${
                    m.destaque ? "col-span-2" : ""
                  } ${m.imagem ? "cursor-pointer" : ""}`}
                  style={{ animationDelay: `${200 + i * 50}ms` }}
                >
                  {m.imagem && (
                    <div className="mb-3 -mt-1 -mx-1 overflow-hidden rounded-md">
                      <img
                        src={m.imagem}
                        alt={m.alt}
                        loading="lazy"
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="absolute right-0 top-0 h-8 w-8 rounded-bl-3xl bg-primary/10" />
                  <h3 className="mb-2 font-display text-lg leading-tight">{m.nome}</h3>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{m.texto}</p>
                </Card>
              );
            })}
          </div>

          <div className="animate-reveal mt-4 rounded-lg border border-secondary/20 bg-secondary/10 p-4 [animation-delay:500ms]">
            <h3 className="mb-1 font-display text-lg leading-tight text-secondary">
              CIRCUITOS E BRINCADEIRAS
            </h3>
            <p className="text-xs text-secondary/80">
              Jogos motores dinâmicos que misturam desafio, risada e superação.
            </p>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-[2px] w-8 bg-secondary" />
            <h2 className="font-display text-2xl uppercase tracking-tight">HORÁRIOS POR IDADE</h2>
          </div>
          <p className="mb-6 font-mono text-[10px] text-primary">AULAS DE SEGUNDA A SEXTA</p>

          <div className="mb-6 flex items-end justify-center gap-2">
            <img
              src={mascoteMenino.url}
              alt="Mascote menino do Super CT com o polegar para cima"
              loading="lazy"
              className="h-32 w-auto"
            />
            <img
              src={mascoteMenina.url}
              alt="Mascote menina do Super CT fazendo um coração com as mãos"
              loading="lazy"
              className="h-32 w-auto"
            />
          </div>

          <div className="animate-reveal overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-primary/10 text-left font-display uppercase tracking-wide text-primary">
                <tr>
                  <th className="px-3 py-3">Turma</th>
                  <th className="px-3 py-3">Horário</th>
                  <th className="px-3 py-3">Idade</th>
                  <th className="px-3 py-3">Dias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {turmas.map((t) => (
                  <tr key={t.turma}>
                    <td className="px-3 py-3 font-display text-secondary">{t.turma}</td>
                    <td className="px-3 py-3 font-mono text-xs">{t.horario}</td>
                    <td className="px-3 py-3 text-muted-foreground">{t.idade}</td>
                    <td className="px-3 py-3 text-muted-foreground">{t.dias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface/50 py-12">
          <div className="mb-6 px-4">
            <h2 className="font-display text-2xl uppercase tracking-tight">NOSSO QG</h2>
            <p className="font-mono text-[10px] text-primary">ESTRUTURA PROFISSIONAL</p>
          </div>

          <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-4 pb-6">
            {galeria.map((foto) => (
              <figure key={foto.legenda} className="w-64 flex-none snap-center">
                <img
                  src={foto.src}
                  alt={foto.alt}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-md object-cover ring-1 ring-border"
                />
                <figcaption className="mt-2 text-[10px] uppercase italic tracking-widest text-muted-foreground">
                  {foto.legenda}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="relative rounded-r-xl border-l-4 border-primary bg-surface p-6">
            <div className="mb-4 flex items-start gap-4">
              <img
                src={logo}
                alt=""
                loading="lazy"
                className="size-16 flex-none rounded-full border-2 border-primary bg-black object-cover"
                style={{ objectPosition: "center 32%" }}
              />
              <div>
                <h3 className="font-display text-xl">PROFESSOR TIO VICTOR</h3>
                <p className="text-xs font-bold text-primary">COORDENADOR TÉCNICO</p>
              </div>
            </div>
            <p className="text-sm italic leading-relaxed text-muted-foreground">
              “O Super CT nasceu da vontade de criar um espaço leve, verdadeiro e amigo, onde
              cada criança possa ser ela mesma, se movimentar e viver a infância como ela
              merece. Valores, disciplina e família estão em cada aula.”
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-black px-6 pb-32 pt-12">
        <div className="mx-auto max-w-screen-md">
          <h2 className="mb-4 font-display text-2xl uppercase tracking-tight">ONDE ESTAMOS</h2>
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-1 size-4 shrink-0 bg-primary" />
            <p className="text-sm text-muted-foreground">
              Rua Geraldo Marcolini, 1609
              <br />
              São Sebastião do Paraíso - MG
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-4 shrink-0 bg-secondary" />
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground"
            >
              WhatsApp (35) 98822-3596
            </a>
          </div>

          <p className="mt-12 text-center font-mono text-[8px] uppercase tracking-widest text-muted-foreground/40">
            © Super CT • Professor Tio Victor
          </p>
        </div>
      </footer>

      {modalAberto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setModalAberto(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white"
            onClick={() => setModalAberto(false)}
          >
            FECHAR
          </button>
          <img
            src={funcionalInfantilImg.url}
            alt="Criança no Super CT fazendo exercício funcional sobre caixa de madeira"
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-[0_0_40px_oklch(0.78_0.19_148/0.25)]"
          />
        </div>
      )}

      <div className="fixed bottom-6 left-6 right-6 z-50 mx-auto max-w-screen-sm">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-whatsapp py-4 font-bold text-primary-foreground shadow-[0_10px_30px_oklch(0.78_0.19_148/0.3)] transition-all active:scale-[0.98]"
        >
          <span className="font-display text-lg tracking-wide">AGENDAR AULA EXPERIMENTAL</span>
        </a>
      </div>
    </div>
  );
}
