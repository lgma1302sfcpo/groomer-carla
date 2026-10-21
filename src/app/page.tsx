import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/effective-permissions";
import { firstAllowedRoute } from "@/lib/first-allowed-route";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");
  const permissions = await getEffectivePermissions(session.user.id, session.user.currentTenantId);
  redirect(firstAllowedRoute(permissions));
}
