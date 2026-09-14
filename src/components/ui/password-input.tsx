"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "./input";

export function PasswordInput({ className, disabled, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe";
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input {...props} disabled={disabled} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-controls={props.id}
        title={label}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
