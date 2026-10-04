"use server";

/**
 * Profile Server Actions. Phase 1 stores the avatar as an image URL (e.g. the
 * Google profile photo or a pasted URL); object-storage uploads come later.
 */
import { revalidatePath } from "next/cache";
import { requireContext } from "@/shared/auth/session";
import { action, type ActionResult } from "@/shared/application/action-result";
import { updateProfile, type ProfileView } from "@/modules/identity";
import { profileSchema } from "@/modules/identity/interface/schemas";

export async function updateProfileAction(input: unknown): Promise<ActionResult<ProfileView>> {
  return action(async () => {
    const ctx = await requireContext();
    const data = profileSchema.parse(input);
    const profile = await updateProfile(ctx.userId, {
      name: data.name,
      company: data.company === "" ? null : data.company,
      website: data.website === "" ? null : data.website,
      image: data.image === "" ? null : data.image,
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return profile;
  });
}
