"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div role="alert" className="space-y-4 rounded-xl border bg-card p-8"><h1 className="text-xl font-semibold">Não foi possível abrir esta página</h1><p className="text-sm text-muted-foreground">Tenta novamente. Os dados guardados não foram alterados.</p><Button onClick={reset}>Tentar novamente</Button></div>; }
