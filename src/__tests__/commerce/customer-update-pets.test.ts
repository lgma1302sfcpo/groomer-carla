// @vitest-environment node

import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import type { UpdateCustomerDTO } from "@/dtos/commerce/customer.dto";
import { PrismaCommerceRepository } from "@/repositories/commerce/prisma-commerce.repository";

const tx = {
  customer: { updateMany: vi.fn(), findFirst: vi.fn() },
  pet: { findMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), create: vi.fn() }
};
const repository = new PrismaCommerceRepository({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaClient);

const base: UpdateCustomerDTO = { name: "Mônica", creditLimit: 0, tags: [], status: "ACTIVE", pets: [] };
const pitchula = { id: "pet-1", name: "Pitchula", _count: { groomingAppointments: 3 } };

describe("edição de cliente com pets da agenda", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    tx.customer.updateMany.mockResolvedValue({ count: 1 });
    tx.customer.findFirst.mockResolvedValue(null);
  });

  it("atualiza o pet existente sem apagar, preservando os agendamentos", async () => {
    tx.pet.findMany.mockResolvedValue([pitchula]);

    await repository.updateCustomer("tenant-1", "branch-1", "customer-1", { ...base, pets: [
      { id: "pet-1", name: "Pitchula", species: "DOG", sex: "FEMALE", breed: "Shih-tzu" },
      { name: "Bob", species: "DOG", sex: "MALE" }
    ] });

    expect(tx.pet.deleteMany).not.toHaveBeenCalled();
    expect(tx.pet.update).toHaveBeenCalledWith({ where: { id: "pet-1" }, data: expect.objectContaining({ name: "Pitchula", breed: "Shih-tzu" }) });
    expect(tx.pet.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: "customer-1", name: "Bob" }) });
  });

  it("impede remover um pet com histórico de banho e tosa", async () => {
    tx.pet.findMany.mockResolvedValue([pitchula]);

    await expect(repository.updateCustomer("tenant-1", "branch-1", "customer-1", { ...base, pets: [{ name: "Bob", species: "DOG", sex: "MALE" }] }))
      .rejects.toMatchObject({ code: "PET_HAS_GROOMING_HISTORY", status: 409 });
    expect(tx.pet.deleteMany).not.toHaveBeenCalled();
  });

  it("remove pets sem histórico e ignora ids de pets de outro cliente", async () => {
    tx.pet.findMany.mockResolvedValue([{ id: "pet-2", name: "Luna", _count: { groomingAppointments: 0 } }]);

    await repository.updateCustomer("tenant-1", "branch-1", "customer-1", { ...base, pets: [{ id: "pet-de-outro", name: "Thor", species: "DOG", sex: "MALE" }] });

    expect(tx.pet.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["pet-2"] }, customerId: "customer-1" } });
    expect(tx.pet.update).not.toHaveBeenCalled();
    expect(tx.pet.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: "customer-1", name: "Thor" }) });
  });
});
