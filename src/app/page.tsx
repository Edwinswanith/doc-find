import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, readPrototypeCookie } from "@/lib/prototype-session"

export default async function Home() {
  const actor = readPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (actor.role === "manager") redirect(`/clinic/${actor.organisationId}/today`)
  if (actor.role === "doctor") redirect("/doctor/today")
  if (actor.role === "approver") redirect("/approver/reviews")
  if (actor.role === "finance") redirect("/finance/reconciliation")
  redirect("/operations/cases")
}
