import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { saveOnboardingDraft } from "@/lib/workspace/service"
import { WorkspaceDomainError } from "@/lib/workspace/domain"

const schema = z.object({ step: z.number().int().min(1).max(8), fields: z.record(z.string(), z.string().max(500)) })

export async function PUT(request: Request, context: { params: Promise<{ audience: string }> }) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Choose a demo identity." } }, { status: 401 })
  const audience = (await context.params).audience
  if (audience !== "doctor" && audience !== "clinic") return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Onboarding route not found." } }, { status: 404 })
  const expectedVersion = Number(request.headers.get("Expected-Version"))
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!Number.isInteger(expectedVersion) || !parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_DRAFT", message: "The onboarding draft is invalid." } }, { status: 400 })
  try { return NextResponse.json({ success: true, data: await saveOnboardingDraft(actor.id, audience, expectedVersion, parsed.data.step, parsed.data.fields) }) }
  catch (cause) { const error = cause as WorkspaceDomainError; return NextResponse.json({ success: false, error: { code: error.code || "SAVE_FAILED", message: error.message, currentVersion: error.currentVersion } }, { status: error.code === "FORBIDDEN" ? 403 : 409 }) }
}
