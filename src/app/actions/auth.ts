"use server";

/**
 * Authentication Server Actions. Each returns an ActionResult; navigation and
 * the post-success signIn are handled client-side so no NEXT_REDIRECT is thrown
 * through the result envelope.
 */
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { registerUser, requestPasswordReset, resetPassword } from "@/modules/identity";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/modules/identity/interface/schemas";
import { action, ok, fail, type ActionResult } from "@/shared/application/action-result";
import { captureServerEvent } from "@/lib/posthog";

export async function registerAction(input: unknown): Promise<ActionResult<{ email: string }>> {
  return action(async () => {
    const data = registerSchema.parse(input);
    const { userId } = await registerUser(data);
    captureServerEvent({ distinctId: userId, event: "user_registered" });
    return { email: data.email.toLowerCase() };
  });
}

export async function loginAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", "Please check the highlighted fields.", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return ok(null);
  } catch (err) {
    if (err instanceof AuthError) {
      return fail("UNAUTHENTICATED", "Invalid email or password.");
    }
    throw err;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<null>> {
  return action(async () => {
    const { email } = forgotPasswordSchema.parse(input);
    await requestPasswordReset(email);
    return null; // always succeeds (enumeration-safe)
  });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  return action(async () => {
    const { token, password } = resetPasswordSchema.parse(input);
    await resetPassword(token, password);
    return null;
  });
}
