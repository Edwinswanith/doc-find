import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { resetWorkspaceState } from "@/lib/workspace/store"
import { z } from "zod"

export async function POST(request: Request) {
  const actor = verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Choose a demo identity first." } }, { status: 401 })
  const parsed = z.object({ confirmation: z.literal("RESET DOC+FIND DEMO") }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "CONFIRMATION_REQUIRED", message: "Confirm the named fictional demo reset." } }, { status: 400 })
  if (process.env.DEMO_MODE !== "true") return NextResponse.json({ success: false, error: { code: "DEMO_MODE_DISABLED", message: "Demo reset is disabled." } }, { status: 403 })
  await resetWorkspaceState()
  return NextResponse.json({ success: true, data: { reset: true, scenario: "sapphire-functional-v1", database: "doc_find_demo" } })
}
