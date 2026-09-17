import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, defaultRouteForUser, verifyPrototypeCookie } from "@/lib/prototype-session"
import { completeOnboarding } from "@/lib/workspace/service"
import { WorkspaceDomainError } from "@/lib/workspace/domain"

const schema = z.object({ fields: z.record(z.string(), z.string().max(2000)) })

export async function POST(request: Request, context: { params: Promise<{ audience: string }> }) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 })
  const audience = (await context.params).audience
  if (audience !== "doctor" && audience !== "clinic") return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Onboarding route not found." } }, { status: 404 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_DRAFT", message: "Your profile details are invalid." } }, { status: 400 })
  try {
    const user = await completeOnboarding(actor.id, audience, parsed.data.fields)
    return NextResponse.json({ success: true, data: { redirectTo: defaultRouteForUser(user) } })
  } catch (cause) {
    const error = cause as WorkspaceDomainError
    return NextResponse.json({ success: false, error: { code: error.code || "COMPLETE_FAILED", message: error.message || "Your profile could not be completed. Please try again." } }, { status: error.code === "FORBIDDEN" ? 403 : error.code === "INVALID_COMMAND" ? 400 : 500 })
  }
}
