import { useState } from "react";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import { VideoShowcase } from "@/components/VideoShowcase";

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
import funcionalFoto1 from "@/assets/funcional-foto1.jpg.asset.json";
import funcionalFoto2 from "@/assets/funcional-foto2.jpg.asset.json";
import funcionalFoto3 from "@/assets/funcional-foto3.jpg.asset.json";
import funcionalInfantilCover from "@/assets/funcional-infantil-cover.jpg";
import funcionalFoto4 from "@/assets/funcional-foto4.jpg.asset.json";
import funcionalFoto5 from "@/assets/funcional-foto5.jpg.asset.json";
import funcionalFoto6 from "@/assets/funcional-foto6.jpg.asset.json";
import esportesCover from "@/assets/esportes-cover-cropped.png.asset.json";
import esportesFoto1 from "@/assets/esportes-foto1.jpg.asset.json";
import esportesFoto2 from "@/assets/esportes-foto2.jpg.asset.json";
import esportesFoto3 from "@/assets/esportes-foto3.jpg.asset.json";
import argolasFoto1 from "@/assets/argolas-foto1.jpg.asset.json";
import argolasFoto2 from "@/assets/argolas-foto2.jpg.asset.json";
import argolasFoto3 from "@/assets/argolas-foto3.jpg.asset.json";
import trepaTrepaCover from "@/assets/trepa-trepa-cover.jpg.asset.json";
import escaladaFoto1 from "@/assets/escalada-foto1.jpg.asset.json";
import escaladaCover from "@/assets/escalada-cover.jpg.asset.json";
import ginasticaCover from "@/assets/ginastica-cover.jpg.asset.json";
import ginasticaFoto2 from "@/assets/ginastica-foto2.jpg.asset.json";
import campaoCover from "@/assets/campao-cover.jpg.asset.json";
import campaoFoto1 from "@/assets/campao-foto1.jpg.asset.json";
import campaoFoto2 from "@/assets/campao-foto2.jpg.asset.json";
import campaoFoto3 from "@/assets/campao-foto3.jpg.asset.json";
import campaoFoto4 from "@/assets/campao-foto4.jpg.asset.json";
import campaoFoto5 from "@/assets/campao-foto5.jpg.asset.json";
import campaoFoto6 from "@/assets/campao-foto6.jpg.asset.json";
import campaoFoto7 from "@/assets/campao-foto7.jpg.asset.json";
import campaoFoto8 from "@/assets/campao-foto8.jpg.asset.json";
import campaoFoto9 from "@/assets/campao-foto9.jpg.asset.json";
import coloniaFoto1 from "@/assets/colonia-foto1.jpg.asset.json";
import coloniaFoto2 from "@/assets/colonia-foto2.png.asset.json";
import coloniaFoto3 from "@/assets/colonia-foto3.jpg.asset.json";
import coloniaCover from "@/assets/colonia-cover.jpg.asset.json";
import professorTioVictor from "@/assets/professor-tio-victor.png.asset.json";

const turmas = [
  { turma: "1", horario: "08:30 às 10:30", idade: "04 a 12 anos", dias: "Segunda a sexta" },
  { turma: "2", horario: "15:45 às 17:45", idade: "07 a 14 anos", dias: "Segunda a sexta" },
  { turma: "3", horario: "17:45 às 18:45", idade: "04 a 07 anos", dias: "Segunda a quinta" },
  { turma: "4", horario: "18:45 às 19:45", idade: "08 a 14 anos", dias: "Segunda a quinta" },
];

const WHATSAPP = "https://wa.me/5535988223596";
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Rua+Geraldo+Marcolini%2C+1609%2C+São+Sebastião+do+Paraíso+-+MG%2C+Brasil";

const TITLE = "Super CT — Treinamento Funcional Infantil em São Sebastião do Paraíso";
const DESCRIPTION =
  "Sua criança vira super! Treinamento funcional infantil e recreativo, ginástica, esportes e circuitos com o Professor Tio Victor. Rua Geraldo Marcolini 1609, São Sebastião do Paraíso - MG.";

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

type Modalidade = {
  nome: string;
  texto: string;
  imagem?: string;
  alt?: string;
  destaque?: boolean;
  clicavel?: boolean;
  position?: string;
  fotos?: { src: string; alt: string }[];
};

const modalidades: Modalidade[] = [
  {
    nome: "FUNCIONAL INFANTIL",
    texto: "Força, coordenação e postura para o dia a dia.",
    imagem: funcionalInfantilCover,
    alt: "Caixa de madeira, corda naval e bolas de peso azul e rosa sobre tatame preto",
    destaque: true,
    clicavel: true,
    fotos: [
      {
        src: funcionalInfantilImg.url,
        alt: "Criança no Super CT fazendo exercício funcional sobre caixa de madeira",
      },
      {
        src: funcionalFoto1.url,
        alt: "Menino em prancha com apoio no step durante treino funcional no Super CT",
      },
      {
        src: funcionalFoto3.url,
        alt: "Menino saltando a caixa de madeira em treino funcional no Super CT",
      },
      {
        src: funcionalFoto4.url,
        alt: "Criança escalando corda naval em treino funcional no Super CT",
      },
      {
        src: funcionalFoto5.url,
        alt: "Aluno apoiado no step em exercício funcional no Super CT",
      },
      {
        src: funcionalFoto6.url,
        alt: "Menino sentado no tatame do Super CT com bola de peso e arco",
      },
    ],
  },
  {
    nome: "GINÁSTICA",
    texto: "Base motora, equilíbrio e flexibilidade.",
    imagem: ginasticaCover.url,
    alt: "Jump com a logo Super CT gravada em cinza e elásticos de perna sobre tatame preto",
    destaque: true,
    clicavel: true,
    fotos: [
      {
        src: funcionalFoto2.url,
        alt: "Menina pulando no mini trampolim em frente à parede de escalada do Super CT",
      },
      {
        src: ginasticaFoto2.url,
        alt: "Aluna do Super CT saltando no jump em frente à parede de escalada",
      },
    ],
  },
  {
    nome: "ESPORTES",
    texto: "Iniciação esportiva com jogo e trabalho em equipe.",
    imagem: esportesCover.url,
    alt: "Crianças em ação no basquete do Super CT com logo e cesta",
    destaque: true,
    position: "top",
    clicavel: true,
    fotos: [
      { src: esportesFoto3.url, alt: "Turma do Super CT em treino de basquete na parede de cimento queimado" },
      { src: esportesFoto1.url, alt: "Duas alunas do Super CT passando a bola em aula de esportes" },
      { src: esportesFoto2.url, alt: "Crianças do Super CT em atividade com bola durante aula de esportes" },
    ],
  },
  {
    nome: "PAREDE DE ESCALADA",
    texto: "Desafio vertical com total segurança.",
    imagem: escaladaCover.url,
    alt: "Parede de escalada do Super CT com agarras coloridas",
    destaque: true,
    clicavel: true,
    fotos: [
      {
        src: escaladaFoto1.url,
        alt: "Menino escalando a parede de escalada do Super CT com o polegar para cima",
      },
    ],
  },
  {
    nome: "SUPER CAMPÃO — AULAS ESPECIAIS",
    texto: "Vôlei de areia, futebol e jogos na arena externa.",
    imagem: campaoCover.url,
    alt: "Camiseta do uniforme Super CT com estampa de lava e escudo dourado sobre a grama do campo, ao lado de uma bola de vôlei",
    destaque: true,
    clicavel: true,
    fotos: [
      { src: campaoFoto8.url, alt: "Turma Super Campão reunida com o Professor Tio Victor no fim da aula" },
      { src: campaoFoto1.url, alt: "Criança do Super CT sacando a bola na quadra de areia" },
      { src: campaoFoto2.url, alt: "Aluno do Super CT com a bola de vôlei na quadra de areia" },
      { src: campaoFoto3.url, alt: "Alunas do Super CT jogando vôlei de areia" },
      { src: campaoFoto4.url, alt: "Turma do Super CT posicionada na quadra de areia antes do jogo" },
      { src: campaoFoto5.url, alt: "Professor Tio Victor com a bola no campo do Super CT" },
      { src: campaoFoto6.url, alt: "Alunas do Super CT abraçadas com o uniforme vermelho no campo" },
      { src: campaoFoto7.url, alt: "Professor Tio Victor conversando com os alunos sentados na areia" },
      { src: campaoFoto9.url, alt: "Turma do Super CT em roda na areia durante a aula especial" },
    ],
  },
  {
    nome: "TREPA-TREPA & ARGOLAS",
    texto: "Domine a gravidade e o movimento.",
    imagem: trepaTrepaCover.url,
    alt: "Aluno do Super CT na estrutura de trepa-trepa com parede de escalada ao fundo",
    destaque: true,
    clicavel: true,
    fotos: [
      { src: trepaTrepaCover.url, alt: "Aluno do Super CT na estrutura de trepa-trepa com parede de escalada ao fundo" },
      { src: argolasFoto1.url, alt: "Criança de cabeça para baixo nas argolas do Super CT" },
      { src: argolasFoto2.url, alt: "Aluna suspensa nas argolas laranja em treino no Super CT" },
      { src: argolasFoto3.url, alt: "Aluno de cabeça para baixo nas argolas laranja no Super CT" },
    ],
  },
  {
    nome: "COLÔNIA DE FÉRIAS E ACAMPAMENTO INDOOR",
    texto: "Diversão máxima nas pausas escolares.",
    imagem: coloniaCover.url,
    alt: "Cartaz Colônia de Férias Edição Ninjas 2026 do Super CT com mascotes ninja e datas 20/07 a 31/07",
    destaque: true,
    clicavel: true,
    position: "top",
    fotos: [
      {
        src: coloniaCover.url,
        alt: "Cartaz Colônia de Férias Edição Ninjas 2026 do Super CT com mascotes ninja e datas 20/07 a 31/07",
      },
      {
        src: coloniaFoto2.url,
        alt: "Turma da Colônia de Férias Edição Ninjas do Super CT reunida com o Professor Tio Victor",
      },
      {
        src: coloniaFoto1.url,
        alt: "Crianças da colônia de férias do Super CT em frente ao painel do Wolverine",
      },
      {
        src: coloniaFoto3.url,
        alt: "Cartaz Super Acampa CT do Tio Victor com aventuras, games, esportes e amizades para meninos",
      },
    ],
  },
];

const galeria = [
  { src: arena.url, legenda: "Arena Principal", alt: "Área de treino do Super CT com piso emborrachado e iluminação laranja" },
  { src: escalada.url, legenda: "Muro Ninja", alt: "Parede de escalada infantil com agarras coloridas" },
  { src: argolas.url, legenda: "Treino Aéreo", alt: "Argolas e estrutura de trepa-trepa do Super CT" },
  { src: circuitos.url, legenda: "Circuitos", alt: "Crianças em circuito de treino com escada de agilidade" },
  { src: fachada.url, legenda: "Nossa Fachada", alt: "Fachada do Super CT com logo na vitrine de vidro" },
];

function Index() {
  const [fotosAbertas, setFotosAbertas] = useState<Modalidade["fotos"] | null>(null);

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
            className="animate-pulse-slow rounded-sm bg-primary px-4 py-2 font-display text-sm text-primary-foreground transition-transform active:scale-95"
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
            <div className="mx-auto mb-1 w-full max-w-[200px]">
              <img
                src={logo}
                alt="Logo Super CT"
                width={1024}
                height={1536}
                className="h-auto w-full object-contain"
              />
            </div>



            <h1 className="mb-4 text-pretty text-center font-display text-5xl uppercase leading-[0.9] tracking-tighter">
              SUA CRIANÇA VIRA <span className="text-primary italic">SUPER!</span>
            </h1>
            <p className="mx-auto max-w-[30ch] text-center text-sm text-muted-foreground">
              Treinamento funcional infantil e recreativo, ginástica, esportes e circuitos com o
              Professor Tio Victor.
            </p>
          </div>
        </section>

        <VideoShowcase />

        <section className="px-4 py-12">
          <div className="mb-8 flex items-center gap-2">
            <div className="h-[2px] w-8 bg-primary" />
            <h2 className="font-display text-2xl uppercase tracking-tight">MODALIDADES</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {modalidades.map((m, i) => {
              const abrivel = Boolean(m.clicavel && m.fotos?.length);
              const Card = abrivel ? "button" : "div";
              return (
                <Card
                  key={m.nome}
                  type={abrivel ? "button" : undefined}
                  onClick={abrivel ? () => setFotosAbertas(m.fotos!) : undefined}
                  className={`animate-reveal relative overflow-hidden rounded-lg border border-border bg-surface p-4 text-left transition-transform active:scale-[0.98] ${
                    m.destaque ? "col-span-2" : ""
                  } ${abrivel ? "cursor-pointer" : ""}`}
                  style={{ animationDelay: `${200 + i * 50}ms` }}
                >
                  {m.imagem && (
                    <div className="relative mb-3 -mt-1 -mx-1 overflow-hidden rounded-md">
                      <img
                        src={m.imagem}
                        alt={m.alt}
                        loading="lazy"
                        className="h-48 w-full object-cover"
                        style={{ objectPosition: m.position || "center" }}
                      />
                      {abrivel && (
                        <div className="absolute right-0 top-0 flex h-full w-8 items-center justify-center border-l border-border/40 bg-background/60 backdrop-blur-sm">
                          <ChevronRight className="h-5 w-5 text-primary" />
                        </div>
                      )}
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
                src={professorTioVictor.url}
                alt="Professor Tio Victor"
                loading="lazy"
                width={1024}
                height={1024}
                className="size-16 flex-none rounded-full border-2 border-primary bg-black object-cover"
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
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
          >
            <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <MapPin size={16} className="animate-blink-pin" />
            </div>
            <p className="text-sm text-muted-foreground">
              Rua Geraldo Marcolini, 1609
              <br />
              São Sebastião do Paraíso - MG
            </p>
          </a>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-whatsapp/20 text-whatsapp">
              <Phone size={16} className="animate-pulse-slow-green" />
            </div>
            <p className="text-sm text-muted-foreground">WhatsApp (35) 98822-3596</p>
          </a>

          <p className="mt-12 text-center font-mono text-[8px] uppercase tracking-widest text-muted-foreground/40">
            © Super CT • Professor Tio Victor / CREF 057790/MG - Geraldo Marcolini 1609 - S.S.
            Paraíso/ MG
          </p>
        </div>
      </footer>

      {fotosAbertas && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setFotosAbertas(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white"
            onClick={() => setFotosAbertas(null)}
          >
            FECHAR
          </button>
          <div className="no-scrollbar flex max-h-[85vh] w-full snap-x snap-mandatory gap-4 overflow-x-auto">
            {fotosAbertas.map((f) => (
              <img
                key={f.src}
                src={f.src}
                alt={f.alt}
                className="max-h-[85vh] w-full flex-none snap-center rounded-lg object-contain shadow-[0_0_40px_oklch(0.78_0.19_148/0.25)]"
              />
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-6 right-6 z-50 mx-auto max-w-screen-sm">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="animate-pulse-slow-green flex w-full items-center justify-center gap-3 rounded-xl bg-whatsapp py-4 font-bold text-primary-foreground shadow-[0_10px_30px_oklch(0.78_0.19_148/0.3)] transition-all active:scale-[0.98]"
        >
          <span className="font-display text-lg tracking-wide">AGENDAR AULA EXPERIMENTAL</span>
        </a>
      </div>
    </div>
  );
}
