"use client";
import { logoutAction } from "@/app/actions/auth";
import type { AuthorizedAppUser } from "@/lib/auth/authorization";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export function ProfileSwitcher({
  user,
  collapsed = false,
}: {
  user: AuthorizedAppUser;
  collapsed?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="text-chrome-foreground"
          aria-label={`Conta de ${user.displayName}`}
        >
          {collapsed
            ? user.displayName.slice(0, 2).toUpperCase()
            : user.displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user.displayName} · sessão ativa</DropdownMenuLabel>
        <form action={logoutAction}>
          <Button className="w-full" variant="ghost" type="submit">
            Terminar sessão
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
