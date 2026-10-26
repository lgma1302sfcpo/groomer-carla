import type { GroomingAppointmentDTO } from "@/dtos/grooming.dto";

export const DEFAULT_GROOMING_COMMISSION_PERCENT = 30;

export function calculateGroomingCommission(price: number, commissionPercent: number) {
  const priceInCents = Math.round((price + Number.EPSILON) * 100);
  const rateInBasisPoints = Math.round(commissionPercent * 100);
  return Math.round(priceInCents * rateInBasisPoints / 10_000) / 100;
}

export function countsTowardGroomingTotals(status: GroomingAppointmentDTO["status"]) {
  return status !== "CANCELLED" && status !== "NO_SHOW";
}
