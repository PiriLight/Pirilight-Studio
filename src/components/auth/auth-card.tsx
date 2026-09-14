import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md rounded-2xl border-border bg-card shadow-xl shadow-black/10">
      <CardHeader className="space-y-3 px-6 pb-7 pt-8 sm:px-8 sm:pt-10">
        <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8 sm:px-8 sm:pb-10">{children}</CardContent>
    </Card>
  );
}
