import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { createWorkspaceFixture } from "@/lib/workspace/fixture"
import { getWorkspaceState } from "@/lib/workspace/store"
import type { WorkspaceUser } from "@/lib/workspace/types"

const COOKIE_NAME = "doc_find_prototype_session"

const demoUsers = createWorkspaceFixture().users

// Demo-only credentials for the prototype login screen. These two are fixed, publicly documented
// demo logins (unrelated to the real, hashed credentials that self-service sign-up creates in
// state.credentials -- see lib/account.ts).
const demoCredentials: Record<string, { password: string; userId: string }> = {
  "doctor@docfind.demo": { password: "qwert@1234", userId: "doctor-anika" },
  "clinic@docfind.demo": { password: "qwert@1234", userId: "manager-sarah" },
}

export function verifyPrototypeCredentials(email: string, password: string) {
  const match = demoCredentials[email.trim().toLowerCase()]
  const suppliedPassword = Buffer.from(password)
  const expectedPassword = Buffer.from(match?.password ?? "")
  const passwordMatches = suppliedPassword.length === expectedPassword.length && timingSafeEqual(suppliedPassword, expectedPassword)
  if (!match || !passwordMatches) return undefined
  return demoUsers.find((user) => user.id === match.userId)
}

// The single source of truth for "where does this user belong right now". A brand-new account
// without a role goes to role selection; a role-holding account that hasn't finished its
// role-specific wizard resumes it; everyone else lands in their normal workspace. Because this
// drives both post-login redirects and the SapphireWorkspacePage route guard, an onboarding-
// incomplete user can never reach the full dashboard by navigating there directly.
export function defaultRouteForUser(user: WorkspaceUser) {
  if (user.role === "pending") return "/onboarding/role"
  if (user.accountStatus === "onboarding") {
    if (user.role === "doctor") return "/onboarding/doctor"
    if (user.role === "manager") return "/onboarding/clinic"
  }
  if (user.role === "manager") return `/clinic/${user.organisationId}/today`
  if (user.role === "doctor") return "/doctor/today"
  if (user.role === "approver") return "/approver/reviews"
  if (user.role === "finance") return "/finance/reconciliation"
  return "/operations/cases"
}

function secret() {
  if (process.env.NODE_ENV === "production" && !process.env.PROTOTYPE_COOKIE_SECRET) throw new Error("PROTOTYPE_COOKIE_SECRET is required in production.")
  return process.env.PROTOTYPE_COOKIE_SECRET || "local-prototype-only-change-before-sharing"
}

function signature(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("hex")
}

export function createPrototypeCookie(userId: string) {
  return `${userId}.${signature(userId)}`
}

// Resolves the signed cookie against the *live* workspace state rather than the static fixture,
// so accounts created through sign-up (which only ever exist in that live state) can authenticate
// too. This is awaited by every server route and server component that reads the current actor.
export async function verifyPrototypeCookie(value?: string): Promise<WorkspaceUser | undefined> {
  if (!value) return undefined
  const separator = value.lastIndexOf(".")
  if (separator < 1) return undefined
  const userId = value.slice(0, separator)
  const supplied = value.slice(separator + 1)
  const expected = signature(userId)
  if (supplied.length !== expected.length) return undefined
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return undefined
  const state = await getWorkspaceState()
  return state.users.find((user) => user.id === userId)
}

export { COOKIE_NAME }
