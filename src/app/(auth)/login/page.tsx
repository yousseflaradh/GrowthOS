import Link from "next/link";
import { googleAuthEnabled } from "@/config/env";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "../_components/login-form";
import { GoogleButton } from "../_components/google-button";

export const metadata = { title: "Sign in · GrowthOS" };

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title={
        <>
          Sign in to <span className="text-gold-500">GrowthOS</span>
        </>
      }
      subtitle="Pick up where you left off — your products, research, and creative."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-gold-500 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
      {googleAuthEnabled && (
        <>
          <Divider />
          <GoogleButton label="Sign in with Google" />
        </>
      )}
    </AuthShell>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1 bg-hairline" />
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">or</span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}
