import kael from "@/assets/heroi-kael.png";
import miah from "@/assets/heroi-miah.png";

export type HeroiId = "kael" | "miah";

export type Heroi = {
  id: HeroiId;
  nome: string;
  poder: string;
  descricao: string;
  cor: string;
  img: string;
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
  },
  {
    id: "miah",
    nome: "Miah",
    poder: "Coragem ágil",
    descricao:
      "Leve como um salto de ginástica, Miah escala paredes, voa nas argolas e nunca desiste de um desafio.",
    cor: "#c084fc",
    img: miah,
  },
];

export const heroiPorId = (id: HeroiId): Heroi => HEROIS.find((h) => h.id === id) ?? HEROIS[0]!;
