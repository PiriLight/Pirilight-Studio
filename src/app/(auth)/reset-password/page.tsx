import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex justify-center">
      <AuthCard
        title="Nova palavra-passe"
        description="Escolhe uma palavra-passe forte e diferente das anteriores."
      >
        <ResetPasswordForm />
      </AuthCard>
    </div>
  );
}
