import { redirect } from "next/navigation";
import { requireContext } from "@/shared/auth/session";
import { getNavData } from "@/modules/identity";
import { AppNav } from "@/components/app/app-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const nav = await getNavData(ctx.userId, ctx.organizationId);
  if (!nav) redirect("/login");

  return (
    <div className="min-h-screen bg-cream-50">
      <AppNav
        user={{
          name: nav.user.name,
          email: nav.user.email,
          image: nav.user.image,
          orgName: nav.org.name,
        }}
      />
      {/* Wide ceiling so width-heavy pages (e.g. the landing builder) can
          breathe; each page still sets its own narrower max-width. */}
      <main className="mx-auto max-w-screen-2xl px-6 py-8">{children}</main>
    </div>
  );
}
