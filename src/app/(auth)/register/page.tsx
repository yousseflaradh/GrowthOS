import Link from "next/link";
import { googleAuthEnabled } from "@/config/env";
import { AuthShell } from "../_components/auth-shell";
import { RegisterForm } from "../_components/register-form";
import { GoogleButton } from "../_components/google-button";

export const metadata = { title: "Create account · GrowthOS" };

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      title={
        <>
          Build your <span className="text-gold-500">growth engine</span>
        </>
      }
      subtitle="Create your workspace in seconds. No credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-gold-500 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
      {googleAuthEnabled && (
        <>
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">or</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <GoogleButton label="Sign up with Google" />
        </>
      )}
    </AuthShell>
  );
}
