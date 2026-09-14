import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/paths";

const ERROR_MESSAGES: Record<string, string> = {
  configuration: "A autenticação ainda não está configurada neste ambiente.",
  unauthorized: "A conta autenticada não está autorizada a entrar no Command Center.",
  authorization_unavailable: "O controlo de acesso está temporariamente indisponível.",
  auth_callback: "O link de autenticação é inválido ou expirou.",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : "";
  const successCode = typeof params.success === "string" ? params.success : "";
  const nextPath = safeNextPath(typeof params.next === "string" ? params.next : null);

  return (
    <div className="flex justify-center">
      <AuthCard title="Acesso reservado" description="Entra com a tua conta autorizada PiriLight.">
        <div className="space-y-5">
          <FormMessage message={ERROR_MESSAGES[errorCode]} />
          <FormMessage
            message={
              successCode === "password_updated"
                ? "Palavra-passe atualizada. Já podes entrar com a nova palavra-passe."
                : undefined
            }
            status="success"
          />
          <LoginForm nextPath={nextPath} />
        </div>
      </AuthCard>
    </div>
  );
}
