import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
const mocks = vi.hoisted(() => ({ session: vi.fn(), permissions: vi.fn(), membership: vi.fn(), branches: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentSession: mocks.session }));
vi.mock("@/lib/effective-permissions", () => ({ getEffectivePermissions: mocks.permissions }));
vi.mock("@/lib/prisma", () => ({ prisma: { userTenantRole: { findFirst: mocks.membership }, branch: { findMany: mocks.branches } } }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/layout/erp-shell", () => ({ ErpShell: () => null }));

import ErpLayout from "@/app/(erp)/layout";

describe("nomes atuais no menu", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.session.mockResolvedValue({ user: { id: "user-1", name: "Administrador Teste", currentTenantId: "tenant-1", currentTenantName: "Teste", currentBranchId: "branch-1" } });
    mocks.permissions.mockResolvedValue([]);
    mocks.membership.mockResolvedValue({ user: { name: "Administrador Groomer Carla" }, tenant: { name: "Groomer Carla" } });
    mocks.branches.mockResolvedValue([]);
  });

  it("substitui os nomes antigos da sessão pelos cadastros atuais", async () => {
    const result = await ErpLayout({ children: null });
    expect(result.props.user).toMatchObject({ name: "Administrador Groomer Carla", currentTenantName: "Groomer Carla" });
    expect(mocks.membership).toHaveBeenCalledWith({
      where: { userId: "user-1", tenantId: "tenant-1", isActive: true },
      select: { user: { select: { name: true } }, tenant: { select: { name: true } } }
    });
  });

  it("mantém o nome real de um usuário que não seja o administrador", async () => {
    mocks.membership.mockResolvedValue({ user: { name: "Juliana" }, tenant: { name: "Groomer Carla" } });
    expect((await ErpLayout({ children: null })).props.user.name).toBe("Juliana");
  });

  it("não usa nomes de uma empresa sem vínculo ativo", async () => {
    mocks.membership.mockResolvedValue(null);
    await expect(ErpLayout({ children: null })).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
