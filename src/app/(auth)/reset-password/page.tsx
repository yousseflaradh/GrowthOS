import { AuthShell } from "../_components/auth-shell";
import { ResetForm } from "../_components/reset-form";

export const metadata = { title: "Set new password · GrowthOS" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <AuthShell
      eyebrow="Almost there"
      title={
        <>
          Set a <span className="text-gold-500">new password</span>
        </>
      }
      subtitle="Choose a strong password you don’t use anywhere else."
    >
      <ResetForm token={token} />
    </AuthShell>
  );
}
