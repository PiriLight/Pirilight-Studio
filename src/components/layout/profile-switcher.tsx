"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROFILES, useProfileStore } from "@/store/use-profile-store";
import { cn } from "@/lib/utils";

export function ProfileSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const activeProfileId = useProfileStore((state) => state.activeProfileId);
  const setActiveProfileId = useProfileStore((state) => state.setActiveProfileId);
  const activeProfile = PROFILES[activeProfileId];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex h-auto w-full items-center gap-2 px-2 py-1.5 text-chrome-foreground hover:bg-chrome-surface hover:text-chrome-foreground",
            collapsed ? "justify-center" : "justify-start",
          )}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback>{activeProfile.initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left text-sm font-medium">
                {activeProfile.name}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-chrome-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>A ver como</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(PROFILES).map((profile) => (
          <DropdownMenuItem key={profile.id} onSelect={() => setActiveProfileId(profile.id)}>
            <Avatar className="mr-2 h-6 w-6">
              <AvatarFallback>{profile.initials}</AvatarFallback>
            </Avatar>
            {profile.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Terminar sessão
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
