import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { markNotificationRead } from "@/lib/workspace/service"

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Choose a demo identity." } }, { status: 401 })
  try { return NextResponse.json({ success: true, data: await markNotificationRead(actor.id, (await context.params).id) }) }
  catch { return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "This notification is not available." } }, { status: 403 }) }
}
