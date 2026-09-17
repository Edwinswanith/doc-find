import { NextResponse } from "next/server"
import { z } from "zod"
import { verifyAccountCredentials } from "@/lib/account"
import { COOKIE_NAME, createPrototypeCookie, defaultRouteForUser } from "@/lib/prototype-session"

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean().optional(),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return NextResponse.json({ success: false, error: { code: "INVALID_INPUT", message: fieldErrors.email?.[0] || fieldErrors.password?.[0] || "Check your details and try again.", fieldErrors } }, { status: 400 })
  }
  const user = await verifyAccountCredentials(parsed.data.email, parsed.data.password)
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Incorrect email or password. Please try again." } }, { status: 401 })
  }
  const response = NextResponse.json({ success: true, data: { redirectTo: defaultRouteForUser(user) } })
  response.cookies.set(COOKIE_NAME, createPrototypeCookie(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: parsed.data.rememberMe === false ? 60 * 60 * 12 : 60 * 60 * 24 * 30,
  })
  return response
}
