import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex justify-center">
      <AuthCard
        title="Recuperar acesso"
        description="Enviaremos um link seguro para definires uma nova palavra-passe."
      >
        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}
