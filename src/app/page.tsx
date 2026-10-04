import { redirect } from "next/navigation";
import { getUserId } from "@/shared/auth/session";

/** Root: send authenticated users to the dashboard, others to login. */
export default async function Home() {
  const userId = await getUserId();
  redirect(userId ? "/dashboard" : "/login");
}
