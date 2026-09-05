import kael from "@/assets/heroi-kael.png";
import kaelAnda1 from "@/assets/heroi-kael-anda1-atual.png";
import kaelAnda2 from "@/assets/heroi-kael-anda2-atual.png";
import kaelEscala from "@/assets/heroi-kael-escala-costas-atual.png";
import kaelTrepaTrepa from "@/assets/heroi-kael-trepa-trepa.png";
import miah from "@/assets/heroi-miah.png";
import miahAnda1 from "@/assets/heroi-miah-anda1.png";
import miahAnda2 from "@/assets/heroi-miah-anda2.png";
import miahEscala from "@/assets/heroi-miah-escala-costas-atual.png";
import miahTrepaTrepa from "@/assets/heroi-miah-trepa-trepa.png";

export type HeroiId = "kael" | "miah";

export type Heroi = {
  id: HeroiId;
  nome: string;
  poder: string;
  descricao: string;
  cor: string;
  img: string;
  anda: [string, string];
  escala: string;
  trepaTrepa: string;
};

export const HEROIS: Heroi[] = [
  {
    id: "kael",
    nome: "Kael",
    poder: "Força elétrica",
    descricao:
      "Explosivo e destemido, Kael atravessa qualquer circuito e acerta bolas de tênis com precisão de campeão.",
    cor: "#38bdf8",
    img: kael,
    anda: [kaelAnda1, kaelAnda2],
    escala: kaelEscala,
    trepaTrepa: kaelTrepaTrepa,
  },
  {
    id: "miah",
    nome: "Miah",
    poder: "Coragem ágil",
    descricao:
      "Leve como um salto de ginástica, Miah escala paredes, voa nas argolas e nunca desiste de um desafio.",
    cor: "#c084fc",
    img: miah,
    anda: [miahAnda1, miahAnda2],
    escala: miahEscala,
    trepaTrepa: miahTrepaTrepa,
  },
];

export const heroiPorId = (id: HeroiId): Heroi => HEROIS.find((h) => h.id === id) ?? HEROIS[0]!;
