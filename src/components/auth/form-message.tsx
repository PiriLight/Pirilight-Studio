import { cn } from "@/lib/utils";

export function FormMessage({
  message,
  status = "error",
}: {
  message?: string;
  status?: "error" | "success";
}) {
  if (!message) return null;

  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        status === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
          : "border-success/40 bg-success/10 text-foreground",
      )}
    >
      {message}
    </p>
  );
}
