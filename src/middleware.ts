/**
 * Route protection middleware. Uses the edge-safe auth config only (the JWT is
 * decoded at the edge — no DB access here). Redirect logic lives in
 * authConfig.callbacks.authorized.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except static assets and the auth API routes.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
