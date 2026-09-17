import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { executeWorkspaceCommand } from "@/lib/workspace/service"
import { WorkspaceDomainError } from "@/lib/workspace/domain"

const schema = z.object({
  command: z.enum(["publish", "apply", "invite", "shortlist", "start-discussion", "send-offer", "accept-offer", "decline-offer", "approve-scope", "confirm-readiness", "mark-complete", "confirm-attendance", "submit-invoice", "confirm-payment"]),
  recordId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
})

const fail = (code: string, message: string, status: number, currentVersion?: number) => NextResponse.json({ success: false, error: { code, message, currentVersion } }, { status })

export async function POST(request: Request) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return fail("UNAUTHENTICATED", "Choose a seeded prototype user.", 401)
  const idempotencyKey = request.headers.get("Idempotency-Key")
  const expectedVersion = Number(request.headers.get("Expected-Version"))
  if (!idempotencyKey || !Number.isInteger(expectedVersion) || expectedVersion < 0) return fail("INVALID_COMMAND_HEADERS", "Idempotency-Key and Expected-Version headers are required.", 400)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail("INVALID_COMMAND", "The command payload is invalid.", 400)
  try {
    const result = await executeWorkspaceCommand(actor.id, { ...parsed.data, idempotencyKey, expectedVersion })
    return NextResponse.json({ success: true, data: { recordId: result.recordId, replayed: result.replayed, stateVersion: result.state.version } })
  } catch (cause) {
    if (cause instanceof WorkspaceDomainError) return fail(cause.code, cause.message, cause.code === "FORBIDDEN" ? 403 : cause.code === "NOT_FOUND" ? 404 : 409, cause.currentVersion)
    if (cause instanceof Error && cause.message === "WORKSPACE_VERSION_CONFLICT") return fail("VERSION_CONFLICT", "The workspace changed. Refresh to continue.", 409)
    return fail("COMMAND_FAILED", "The command could not be committed.", 503)
  }
}
