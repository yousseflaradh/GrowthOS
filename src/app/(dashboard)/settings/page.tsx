import { redirect } from "next/navigation";
import { requireContext } from "@/shared/auth/session";
import { getProfile } from "@/modules/identity";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = { title: "Settings · GrowthOS" };

export default async function SettingsPage() {
  const ctx = await requireContext();
  const profile = await getProfile(ctx.userId);
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="# Settings"
        title={
          <>
            Your <span className="text-gold-500">profile</span>
          </>
        }
        description="Manage how you appear across GrowthOS."
      />
      <Card>
        <CardBody>
          <CardTitle className="mb-5 text-base">Profile details</CardTitle>
          <ProfileForm profile={profile} />
        </CardBody>
      </Card>
    </div>
  );
}
