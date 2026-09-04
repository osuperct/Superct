import kael from "@/assets/heroi-kael.png";
import kaelAnda1 from "@/assets/heroi-kael-anda1-v3.png.asset.json";
import kaelAnda2 from "@/assets/heroi-kael-anda2-v3.png.asset.json";
import kaelEscala from "@/assets/heroi-kael-escala-costas-v2.png.asset.json";
import miah from "@/assets/heroi-miah.png";
import miahAnda1 from "@/assets/heroi-miah-anda1.png";
import miahAnda2 from "@/assets/heroi-miah-anda2.png";
import miahEscala from "@/assets/heroi-miah-escala-costas-v2.png.asset.json";

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
    anda: [kaelAnda1.url, kaelAnda2.url],
    escala: kaelEscala.url,
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
    escala: miahEscala.url,
  },
];

export const heroiPorId = (id: HeroiId): Heroi => HEROIS.find((h) => h.id === id) ?? HEROIS[0]!;
