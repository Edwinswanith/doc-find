import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, defaultRouteForUser, verifyPrototypeCookie } from "@/lib/prototype-session"
import { selectAccountRole } from "@/lib/workspace/service"
import { WorkspaceDomainError } from "@/lib/workspace/domain"

const schema = z.object({ role: z.enum(["doctor", "manager"]) })

export async function POST(request: Request) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_ROLE", message: "Choose how you'll use Doc+Find." } }, { status: 400 })
  try {
    const user = await selectAccountRole(actor.id, parsed.data.role)
    return NextResponse.json({ success: true, data: { redirectTo: defaultRouteForUser(user) } })
  } catch (cause) {
    const error = cause as WorkspaceDomainError
    return NextResponse.json({ success: false, error: { code: error.code || "SELECT_ROLE_FAILED", message: error.message || "Your account role could not be set." } }, { status: error.code === "ROLE_ALREADY_SET" ? 409 : 500 })
  }
}
