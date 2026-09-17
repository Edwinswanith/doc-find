import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, defaultRouteForUser, verifyPrototypeCookie } from "@/lib/prototype-session"
import { LoginScreen } from "@/components/LoginScreen"

export const metadata = { title: "Log in · Doc+Find" }

export default async function LoginPage() {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (actor) redirect(defaultRouteForUser(actor))
  return <LoginScreen />
}
