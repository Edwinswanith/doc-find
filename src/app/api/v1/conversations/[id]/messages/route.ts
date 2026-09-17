import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { sendWorkspaceMessage } from "@/lib/workspace/service"
import { WorkspaceDomainError } from "@/lib/workspace/domain"

const schema = z.object({ body: z.string().trim().min(1).max(2000), proposedRateMinor: z.number().int().min(10000).max(500000).optional() })

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Choose a demo identity." } }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_MESSAGE", message: "Write a message of up to 2,000 characters." } }, { status: 400 })
  try {
    return NextResponse.json({ success: true, data: await sendWorkspaceMessage(actor.id, (await context.params).id, parsed.data.body, parsed.data.proposedRateMinor) })
  } catch (cause) {
    const error = cause as WorkspaceDomainError
    return NextResponse.json({ success: false, error: { code: error.code || "MESSAGE_FAILED", message: error.message } }, { status: error.code === "FORBIDDEN" ? 403 : 503 })
  }
}
