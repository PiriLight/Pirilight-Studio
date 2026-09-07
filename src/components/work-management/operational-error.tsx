"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OperationalError({ reset, area }: { reset: () => void; area: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><div><h2 className="font-semibold">Não foi possível carregar {area}</h2><p className="mt-1 text-sm text-muted-foreground">Confirma a ligação local e tenta novamente.</p></div><Button variant="outline" onClick={reset}>Tentar novamente</Button></div>;
}
