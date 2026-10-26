import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ErpShell } from "@/components/layout/erp-shell";
import { getCurrentSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/effective-permissions";
import { prisma } from "@/lib/prisma";

export default async function ErpLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  session.user.permissions = await getEffectivePermissions(session.user.id, session.user.currentTenantId);

  // Display names can change while the user still has an older JWT session.
  const membership = await prisma.userTenantRole.findFirst({
    where: { userId: session.user.id, tenantId: session.user.currentTenantId, isActive: true },
    select: { user: { select: { name: true } }, tenant: { select: { name: true } } }
  });

  if (!membership) redirect("/login");

  session.user.name = membership.user.name;
  session.user.currentTenantName = membership.tenant.name;

  const branches = await prisma.branch.findMany({
    where: {
      tenantId: session.user.currentTenantId,
      status: "ACTIVE",
      ...(session.user.canAccessAllBranches
        ? {}
        : { id: session.user.currentBranchId ?? "" })
    },
    select: { id: true, name: true, isMain: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }]
  });

  return <ErpShell user={session.user} branches={branches}>{children}</ErpShell>;
}
