import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAuthorizedUser } from "@/lib/auth/authorization";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  await requireAuthorizedUser();

  return <AppShell>{children}</AppShell>;
}
