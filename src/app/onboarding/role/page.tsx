import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, defaultRouteForUser, verifyPrototypeCookie } from "@/lib/prototype-session"
import { RoleSelectionScreen } from "@/components/RoleSelectionScreen"

export const metadata = { title: "Choose your account type · Doc+Find" }

export default async function RoleSelectionPage() {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) redirect("/login")
  // Role selection is a one-time step -- once an account has a real role, this page just sends it
  // back to wherever it belongs (an in-progress wizard or the finished dashboard).
  if (actor.role !== "pending") redirect(defaultRouteForUser(actor))
  return <RoleSelectionScreen />
}
