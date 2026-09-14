"use client";

import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/layout/mobile-nav";
import { ProfileSwitcher } from "@/components/layout/profile-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getNavItemByHref } from "@/lib/constants/nav";

export function Topbar() {
  const pathname = usePathname();
  const currentItem = getNavItemByHref(pathname ?? "/");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-chrome-border bg-chrome px-4 text-chrome-foreground md:px-6">
      <MobileNav />

      <p className="flex-1 truncate text-sm font-medium">
        {currentItem?.label ?? "PiriLight Studio"}
      </p>

      <ThemeToggle />
      <ProfileSwitcher collapsed />
    </header>
  );
}
