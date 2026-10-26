// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permission: vi.fn(), professional: vi.fn(), service: vi.fn(), pet: vi.fn(),
  overlaps: vi.fn(), block: vi.fn(), create: vi.fn(), createProfessional: vi.fn(), updateProfessional: vi.fn()
}));

vi.mock("@/lib/require-permission", () => ({ requirePermission: mocks.permission }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  groomingProfessional: { findFirst: mocks.professional, create: mocks.createProfessional, updateMany: mocks.updateProfessional },
  groomingService: { findFirst: mocks.service }, pet: { findFirst: mocks.pet },
  groomingAppointment: { findMany: mocks.overlaps, create: mocks.create },
  groomingScheduleBlock: { findFirst: mocks.block }
} }));

import { POST } from "@/app/api/grooming/route";
import { POST as createProfessional, PATCH as updateProfessional } from "@/app/api/grooming/professionals/route";
import { AppError } from "@/lib/errors";
import { AUTH_PERMISSIONS } from "@/lib/permissions";

const scope = { tenantId: "tenant-1", branchId: "branch-1" };
const payload = {
  customerId: "customer-1", petId: "pet-1", serviceId: "service-1", professionalId: "professional-1",
  startAt: "2026-10-25T09:00:00-03:00", price: 90, isPackage: false
};
function request(data: object, method = "POST") {
  return new NextRequest("http://localhost/api/grooming", { method, body: JSON.stringify(data) });
}

describe("comissões persistidas na API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.permission.mockResolvedValue({ user: { id: "user-1", currentTenantId: scope.tenantId, currentBranchId: scope.branchId } });
    mocks.professional.mockResolvedValue({ id: payload.professionalId, commissionPercent: "35.00" });
    mocks.service.mockResolvedValue({ id: payload.serviceId, durationMinutes: 60 });
    mocks.pet.mockResolvedValue({ id: payload.petId });
    mocks.overlaps.mockResolvedValue([]);
    mocks.block.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "appointment-1", startAt: new Date(payload.startAt), endAt: new Date("2026-10-25T10:00:00-03:00") });
    mocks.createProfessional.mockResolvedValue({ id: "professional-1", commissionPercent: "33.33" });
    mocks.updateProfessional.mockResolvedValue({ count: 1 });
  });

  it.each([false, true])("salva comissão calculada pelo servidor, incluindo pacotes: %s", async (isPackage) => {
    expect((await POST(request({ ...payload, isPackage, commissionAmount: 999, commissionPercent: 100 }))).status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      ...scope, professionalId: payload.professionalId, price: 90, commissionAmount: 31.5, isPackage
    }) }));
    expect(mocks.professional).toHaveBeenCalledWith({ where: { id: payload.professionalId, ...scope, active: true } });
    expect(mocks.permission).toHaveBeenCalledWith(AUTH_PERMISSIONS.GROOMING_WRITE);
  });

  it("arredonda para centavos antes de persistir", async () => {
    expect((await POST(request({ ...payload, price: 19.99 }))).status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data.commissionAmount).toBe(7);
  });

  it("mantém agendamentos sem comissão quando o profissional usa zero", async () => {
    mocks.professional.mockResolvedValue({ id: payload.professionalId, commissionPercent: 0 });
    expect((await POST(request(payload))).status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data.commissionAmount).toBe(0);
  });

  it("não usa profissional de outra empresa ou loja", async () => {
    mocks.professional.mockResolvedValue(null);
    expect((await POST(request(payload))).status).toBe(422);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("cadastra percentual sem zerá-lo", async () => {
    const response = await createProfessional(request({ name: "Carla", commissionPercent: "33,33" }));
    expect(response.status).toBe(201);
    expect(mocks.createProfessional).toHaveBeenCalledWith({ data: { ...scope, name: "Carla", commissionPercent: 33.33 } });
    expect(await response.json()).toMatchObject({ data: { commissionPercent: 33.33 } });
  });

  it("cadastra um novo profissional com comissão padrão de 30%", async () => {
    expect((await createProfessional(request({ name: "Carla" }))).status).toBe(201);
    expect(mocks.createProfessional).toHaveBeenCalledWith({ data: { ...scope, name: "Carla", commissionPercent: 30 } });
  });

  it("calcula 30% sobre o serviço com a configuração acordada", async () => {
    mocks.professional.mockResolvedValue({ id: payload.professionalId, commissionPercent: "30.00" });
    expect((await POST(request(payload))).status).toBe(201);
    expect(mocks.create.mock.calls[0][0].data.commissionAmount).toBe(27);
  });

  it("altera somente o percentual do profissional da loja selecionada, preservando agendamentos", async () => {
    expect((await updateProfessional(request({ id: payload.professionalId, name: "Carla", commissionPercent: "40,5" }, "PATCH"))).status).toBe(200);
    expect(mocks.updateProfessional).toHaveBeenCalledWith({ where: { id: payload.professionalId, ...scope }, data: { name: "Carla", commissionPercent: 40.5 } });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([-1, 101, "10,999"])("impede salvar percentual inválido: %s", async (commissionPercent) => {
    expect((await createProfessional(request({ name: "Carla", commissionPercent }))).status).toBe(422);
    expect(mocks.createProfessional).not.toHaveBeenCalled();
  });

  it("exige permissão para cadastrar comissão", async () => {
    mocks.permission.mockRejectedValue(new AppError("Sem permissão.", "FORBIDDEN", 403));
    expect((await createProfessional(request({ name: "Carla", commissionPercent: 35 }))).status).toBe(403);
    expect(mocks.createProfessional).not.toHaveBeenCalled();
  });
});
