"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Menu, X, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/settings", label: "Settings" },
];

interface NavUser {
  name: string | null;
  email: string;
  image: string | null;
  orgName: string;
}

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="bg-hero sticky top-0 z-40 border-b border-white/10 print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard">
            <Logo tone="dark" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive(l.href)
                    ? "bg-white/10 text-gold-500"
                    : "text-ondark-muted hover:text-ondark",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="gold" size="sm" className="hidden sm:inline-flex">
            <Link href="/projects?new=1">+ New project</Link>
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="rounded-full focus-gold" aria-label="Account menu">
                <Avatar name={user.name} email={user.email} src={user.image} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-56 rounded-2xl border border-hairline bg-white p-2 shadow-lg"
              >
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-ink">{user.name ?? "Account"}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-gold-500">
                    {user.orgName}
                  </p>
                </div>
                <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
                <DropdownMenu.Item asChild>
                  <Link
                    href="/settings"
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-body outline-none hover:bg-cream-100"
                  >
                    <SettingsIcon size={15} /> Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    void logoutAction();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-500 outline-none hover:bg-redtint"
                >
                  <LogOut size={15} /> Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <button
            className="text-ondark md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-6 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium",
                isActive(l.href) ? "bg-white/10 text-gold-500" : "text-ondark-muted",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
