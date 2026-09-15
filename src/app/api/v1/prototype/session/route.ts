import { NextResponse } from "next/server"
import { z } from "zod"
import { COOKIE_NAME, createPrototypeCookie } from "@/lib/prototype-session"
import { createWorkspaceFixture } from "@/lib/workspace/fixture"

const demoUsers = createWorkspaceFixture().users

const schema = z.object({ userId: z.string().min(1) })

export async function GET() {
  return NextResponse.json({ success: true, data: demoUsers })
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success || !demoUsers.some((user) => user.id === parsed.data.userId)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_USER", message: "Choose a seeded prototype user." } }, { status: 400 })
  }
  const response = NextResponse.json({ success: true, data: { userId: parsed.data.userId } })
  response.cookies.set(COOKIE_NAME, createPrototypeCookie(parsed.data.userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  })
  return response
}
