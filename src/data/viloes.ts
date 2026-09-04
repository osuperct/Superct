import lordeLag from "@/assets/lorde-lag.png.asset.json";
import sonekao from "@/assets/sonekao.png.asset.json";
import choralina from "@/assets/choralina.png.asset.json";
import tropecildo from "@/assets/tropecildo.png.asset.json";
import doceman from "@/assets/doceman.png.asset.json";
import respondao from "@/assets/respondao.png.asset.json";

export type Vilao = {
  nome: string;
  poder: string;
  desc: string;
  cor: string;
  img: string;
};

export const VILOES: Vilao[] = [
  {
    nome: "Lorde Lag",
    poder: "Tela excessiva",
    desc: "Ele te prende nas telas e rouba seu tempo e energia.",
    cor: "#a855f7",
    img: lordeLag.url,
  },
  {
    nome: "Sonekão",
    poder: "Preguiça",
    desc: "Ele te faz escolher o fácil e te afasta dos seus objetivos.",
    cor: "#a3e635",
    img: sonekao.url,
  },
  {
    nome: "Choralina",
    poder: "Ansiedade",
    desc: "Ela enche sua mente de preocupações e tira sua confiança.",
    cor: "#f43f5e",
    img: choralina.url,
  },
  {
    nome: "Tropecildo",
    poder: "Falta de coordenação",
    desc: "Ele bagunça seus movimentos e te faz tropeçar nos desafios.",
    cor: "#f59e0b",
    img: tropecildo.url,
  },
  {
    nome: "Doceman",
    poder: "Alimentação inimiga",
    desc: "Ele te atrai com doces e besteiras e tira sua força e disposição.",
    cor: "#ec4899",
    img: doceman.url,
  },
  {
    nome: "Respondão",
    poder: "Mal comportamento e boca suja",
    desc: "Ele te faz falar o que não deve, desrespeitar e afastar quem se importa.",
    cor: "#84cc16",
    img: respondao.url,
  },
];
