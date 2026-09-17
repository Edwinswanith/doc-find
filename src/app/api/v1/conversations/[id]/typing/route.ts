import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { getWorkspaceState } from "@/lib/workspace/store"
import { getTypingUserIds, setTyping } from "@/lib/workspace/typing"

const schema = z.object({ typing: z.boolean() })

async function authoriseConversation(actorId: string, conversationId: string) {
  const state = await getWorkspaceState()
  return state.conversations.some((item) => item.id === conversationId && item.participantIds.includes(actorId))
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: "INVALID_TYPING_STATE", message: "Invalid typing state." } }, { status: 400 })
  const conversationId = (await context.params).id
  if (!(await authoriseConversation(actor.id, conversationId))) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "This conversation is not available." } }, { status: 403 })
  await setTyping(conversationId, actor.id, parsed.data.typing)
  return NextResponse.json({ success: true })
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 })
  const conversationId = (await context.params).id
  if (!(await authoriseConversation(actor.id, conversationId))) return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "This conversation is not available." } }, { status: 403 })
  return NextResponse.json({ success: true, data: { typingUserIds: await getTypingUserIds(conversationId, actor.id) } })
}
