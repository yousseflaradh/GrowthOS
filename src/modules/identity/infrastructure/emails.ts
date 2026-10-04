/**
 * Transactional email templates for the identity context.
 * Returns EmailJobData ready to enqueue onto email.outbound.
 */
import type { EmailJobData } from "@/lib/queues";

export function passwordResetEmail(to: string, url: string): EmailJobData {
  return {
    to,
    subject: "Reset your GrowthOS password",
    text: `Reset your password using this link (valid for 1 hour):\n${url}\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="margin:0 0 12px">Reset your password</h2>
        <p style="color:#444;line-height:1.5">
          We received a request to reset your GrowthOS password. This link is valid for 1 hour.
        </p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
            Reset password
          </a>
        </p>
        <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };
}

export function welcomeEmail(to: string, name: string): EmailJobData {
  return {
    to,
    subject: "Welcome to GrowthOS",
    text: `Hi ${name}, welcome to GrowthOS!`,
    html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif"><h2>Welcome, ${name} 👋</h2><p>Your workspace is ready.</p></div>`,
  };
}
