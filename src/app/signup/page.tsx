import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, defaultRouteForUser, verifyPrototypeCookie } from "@/lib/prototype-session"
import { SignUpScreen } from "@/components/SignUpScreen"

export const metadata = { title: "Sign up · Doc+Find" }

export default async function SignUpPage() {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (actor) redirect(defaultRouteForUser(actor))
  return <SignUpScreen />
}
