import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { COOKIE_NAME, verifyPrototypeCookie } from "@/lib/prototype-session"
import { getWorkspaceState } from "@/lib/workspace/store"
import { authorisedWorkspaceState } from "@/lib/workspace/policy"

export async function GET() {
  const actor = verifyPrototypeCookie((await cookies()).get(COOKIE_NAME)?.value)
  if (!actor) return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Choose a demo identity." } }, { status: 401 })
  const state = await getWorkspaceState()
  return NextResponse.json({ success: true, data: authorisedWorkspaceState(state, actor), meta: { actorId: actor.id, persistence: process.env.MONGODB_URI ? "mongodb" : "demo_memory" } })
}
