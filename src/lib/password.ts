import "server-only"
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

// scrypt is part of Node's standard library, so hashing new sign-up passwords needs no extra
// dependency. The demo credentials in prototype-session.ts stay as plain hardcoded strings --
// they are fixed, publicly documented demo logins, not real account passwords.
const KEY_LENGTH = 64

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex")
  return { salt, hash }
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const expected = Buffer.from(hash, "hex")
  const supplied = scryptSync(password, salt, KEY_LENGTH)
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}

const PASSWORD_MIN_LENGTH = 8

export function passwordRequirementIssues(password: string): string[] {
  const issues: string[] = []
  if (password.length < PASSWORD_MIN_LENGTH) issues.push(`At least ${PASSWORD_MIN_LENGTH} characters`)
  if (!/[a-z]/.test(password)) issues.push("One lowercase letter")
  if (!/[A-Z]/.test(password)) issues.push("One uppercase letter")
  if (!/[0-9]/.test(password)) issues.push("One number")
  return issues
}
