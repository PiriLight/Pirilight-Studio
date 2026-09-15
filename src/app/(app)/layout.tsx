import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAuthorizedUser } from "@/lib/auth/authorization";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthorizedUser();

  return <AppShell user={user}>{children}</AppShell>;
}
