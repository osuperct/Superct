import { describe, expect, it } from "vitest";
import { ganhouOuro, limitar, trofeusTaf } from "../src/lib/avaliacaoSuper";

describe("TAF Super CT", () => {
  it("polichinelo precisa de 100 para ouro", () => {
    expect(ganhouOuro("polichinelo", 99)).toBe(false);
    expect(ganhouOuro("polichinelo", 100)).toBe(true);
  });
  it("sprawl precisa de 50 para ouro", () => {
    expect(ganhouOuro("sprawl", 49)).toBe(false);
    expect(ganhouOuro("sprawl", 50)).toBe(true);
  });
  it("corda, argola e parede precisam de 1", () => {
    expect(ganhouOuro("corda", 1)).toBe(true);
    expect(ganhouOuro("argola", 0)).toBe(false);
    expect(ganhouOuro("parede", 1)).toBe(true);
  });
  it("trepa-trepa precisa de 2 passadas", () => {
    expect(ganhouOuro("trepa", 1)).toBe(false);
    expect(ganhouOuro("trepa", 2)).toBe(true);
  });
  it("limites máximos", () => {
    expect(limitar(150, 100)).toBe(100);
    expect(limitar(60, 42)).toBe(42);
    expect(limitar(12, 10, 1)).toBe(10);
    expect(limitar(0, 10, 1)).toBe(1);
  });
  it("conta troféus", () => {
    expect(trofeusTaf({ polichinelo: 100, sprawl: 10, corda: 1, argola: 1, trepa: 2, parede: 0 })).toBe(4);
  });
});
