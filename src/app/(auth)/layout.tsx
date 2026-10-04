import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-hero relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="absolute left-6 top-6">
        <Logo tone="dark" className="text-lg" />
      </Link>
      <main className="w-full max-w-md">{children}</main>
      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.12em] text-ondark-muted/50">
        © {new Date().getFullYear()} GrowthOS
      </p>
    </div>
  );
}
