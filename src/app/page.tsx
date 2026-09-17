import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, defaultRouteForUser, verifyPrototypeCookie } from "@/lib/prototype-session"

export default async function Home() {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  redirect(actor ? defaultRouteForUser(actor) : "/login")
}
