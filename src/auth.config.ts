/**
 * Edge-safe Auth.js base config. Imported by middleware (no Prisma/bcrypt here)
 * and spread into the full node config in src/auth.ts.
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { env, googleAuthEnabled } from "@/config/env";

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/settings"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: googleAuthEnabled
    ? [Google({ clientId: env.AUTH_GOOGLE_ID!, clientSecret: env.AUTH_GOOGLE_SECRET! })]
    : [],
  callbacks: {
    // Drives route protection from middleware (JWT decoded at the edge).
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
        return isLoggedIn; // false → redirect to signIn page
      }
      if (isLoggedIn && AUTH_PAGES.some((p) => pathname === p)) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
