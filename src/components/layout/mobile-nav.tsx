"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-chrome-foreground hover:bg-chrome-surface hover:text-chrome-foreground md:hidden"
          aria-label="Abrir navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-72 flex-col border-chrome-border bg-chrome p-0 text-chrome-foreground"
      >
        <SheetHeader className="h-14 justify-center border-b border-chrome-border px-3">
          <SheetTitle asChild>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
