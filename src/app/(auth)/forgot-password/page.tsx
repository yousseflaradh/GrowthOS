import Link from "next/link";
import { AuthShell } from "../_components/auth-shell";
import { ForgotForm } from "../_components/forgot-form";

export const metadata = { title: "Reset password · GrowthOS" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title={
        <>
          Forgot your <span className="text-gold-500">password</span>?
        </>
      }
      subtitle="Enter your email and we’ll send you a link to set a new one."
      footer={
        <Link href="/login" className="font-semibold text-gold-500 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
