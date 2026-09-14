import { createHmac, timingSafeEqual } from "node:crypto"
import { demoUsers } from "@/lib/demo-data"

const COOKIE_NAME = "medilink_prototype_session"

function secret() {
  return process.env.PROTOTYPE_COOKIE_SECRET || "local-prototype-only-change-before-sharing"
}

function signature(userId: string) {
  return createHmac("sha256", secret()).update(userId).digest("hex")
}

export function createPrototypeCookie(userId: string) {
  if (!demoUsers.some((user) => user.id === userId)) throw new Error("Unknown prototype user")
  return `${userId}.${signature(userId)}`
}

export function verifyPrototypeCookie(value?: string) {
  if (!value) return undefined
  const separator = value.lastIndexOf(".")
  if (separator < 1) return undefined
  const userId = value.slice(0, separator)
  const supplied = value.slice(separator + 1)
  const expected = signature(userId)
  if (supplied.length !== expected.length) return undefined
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return undefined
  return demoUsers.find((user) => user.id === userId)
}

export function readPrototypeCookie(value?: string) {
  return verifyPrototypeCookie(value) ?? demoUsers[0]
}

export { COOKIE_NAME }
