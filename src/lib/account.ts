import "server-only"
import { verifyPassword } from "@/lib/password"
import { verifyPrototypeCredentials } from "@/lib/prototype-session"
import { getWorkspaceState } from "@/lib/workspace/store"

// Login needs to accept both the two fixed demo logins (checked synchronously, no state read) and
// real accounts created through sign-up (hashed credentials living in state.credentials). Kept
// separate from verifyPrototypeCredentials so that function's existing synchronous tests and
// callers are untouched.
export async function verifyAccountCredentials(email: string, password: string) {
  const demoUser = verifyPrototypeCredentials(email, password)
  if (demoUser) return demoUser
  const normalisedEmail = email.trim().toLowerCase()
  const state = await getWorkspaceState()
  const credential = state.credentials.find((item) => item.email === normalisedEmail)
  if (!credential || !verifyPassword(password, credential.salt, credential.passwordHash)) return undefined
  return state.users.find((user) => user.id === credential.userId)
}
