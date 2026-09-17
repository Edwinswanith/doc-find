import { NextResponse } from "next/server"
import { z } from "zod"
import { passwordRequirementIssues } from "@/lib/password"
import { COOKIE_NAME, createPrototypeCookie, defaultRouteForUser } from "@/lib/prototype-session"
import { createAccount } from "@/lib/workspace/service"
import { WorkspaceDomainError } from "@/lib/workspace/domain"

const schema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  email: z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter a password."),
  termsAccepted: z.boolean().refine((value) => value === true, "Accept the Terms and Privacy Policy to continue."),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return NextResponse.json({ success: false, error: { code: "INVALID_INPUT", message: "Check your details and try again.", fieldErrors } }, { status: 400 })
  }
  const passwordIssues = passwordRequirementIssues(parsed.data.password)
  if (passwordIssues.length) {
    return NextResponse.json({ success: false, error: { code: "WEAK_PASSWORD", message: "Choose a stronger password.", fieldErrors: { password: [`Password needs: ${passwordIssues.join(", ")}`] } } }, { status: 400 })
  }
  try {
    const user = await createAccount(parsed.data)
    const response = NextResponse.json({ success: true, data: { redirectTo: defaultRouteForUser(user) } })
    response.cookies.set(COOKIE_NAME, createPrototypeCookie(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
    return response
  } catch (cause) {
    if (cause instanceof WorkspaceDomainError && cause.code === "EMAIL_TAKEN") {
      return NextResponse.json({ success: false, error: { code: "EMAIL_TAKEN", message: cause.message, fieldErrors: { email: [cause.message] } } }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: { code: "SIGNUP_FAILED", message: "Your account could not be created. Please try again." } }, { status: 503 })
  }
}
