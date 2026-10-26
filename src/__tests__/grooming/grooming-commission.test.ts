import { describe, expect, it } from "vitest";

import { calculateGroomingCommission, countsTowardGroomingTotals } from "@/lib/grooming-commission";
import { groomingProfessionalSchema } from "@/schemas/grooming.schemas";

describe("comissão de banho e tosa", () => {
  it.each([
    [100, 30, 30], [90, 30, 27], [100, 35, 35], [90, 35, 31.5], [85, 33.33, 28.33], [19.99, 35, 7],
    [0.05, 10, 0.01], [1, 0.5, 0.01], [90, 0, 0], [0, 35, 0], [19.99, 100, 19.99]
  ])("calcula R$ %s a %s%% como R$ %s, arredondando em centavos", (price, rate, expected) => {
    expect(calculateGroomingCommission(price, rate)).toBe(expected);
  });

  it("aceita percentuais brasileiros e usa 30% quando não informado", () => {
    expect(groomingProfessionalSchema.parse({ name: "Carla", commissionPercent: "33,33" }).commissionPercent).toBe(33.33);
    expect(groomingProfessionalSchema.parse({ name: "Carla", commissionPercent: 0.29 }).commissionPercent).toBe(0.29);
    expect(groomingProfessionalSchema.parse({ name: "Carla" }).commissionPercent).toBe(30);
    expect(groomingProfessionalSchema.parse({ name: "Carla", commissionPercent: 0 }).commissionPercent).toBe(0);
  });

  it.each([-1, 100.01, "35,555", "abc", null, Infinity])("rejeita percentual inválido: %s", (commissionPercent) => {
    expect(groomingProfessionalSchema.safeParse({ name: "Carla", commissionPercent }).success).toBe(false);
  });

  it("desconsidera cancelamentos e faltas, mantendo concluídos e atendimentos previstos", () => {
    expect(countsTowardGroomingTotals("CANCELLED")).toBe(false);
    expect(countsTowardGroomingTotals("NO_SHOW")).toBe(false);
    for (const status of ["SCHEDULED", "CONFIRMED", "IN_SERVICE", "COMPLETED"] as const) {
      expect(countsTowardGroomingTotals(status)).toBe(true);
    }
  });
});
