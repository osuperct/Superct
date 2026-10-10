import { expect, test } from "bun:test";
import { marcacoesDoAno } from "../src/lib/feriados";

test("recesso inclui todos os dias de 24 a 31 de dezembro de 2026", () => {
  expect(marcacoesDoAno(2026).filter((m) => m.tipo === "recesso").map((m) => m.data)).toEqual([
    "2026-12-24", "2026-12-25", "2026-12-26", "2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31",
  ]);
});

test("recesso inclui os dias 1, 2 e 3 de janeiro de 2027", () => {
  expect(marcacoesDoAno(2027).filter((m) => m.tipo === "recesso").map((m) => m.data)).toEqual([
    "2027-01-01", "2027-01-02", "2027-01-03",
  ]);
});

test("recesso não marca dias fora do período nem se repete em outros anos", () => {
  expect(marcacoesDoAno(2026).find((m) => m.data === "2026-12-23")?.tipo).not.toBe("recesso");
  expect(marcacoesDoAno(2027).find((m) => m.data === "2027-01-04")?.tipo).not.toBe("recesso");
  expect(marcacoesDoAno(2028).filter((m) => m.tipo === "recesso")).toEqual([]);
});