import { describe, expect, it } from "vitest"
import { createPrototypeCookie, readPrototypeCookie, verifyPrototypeCookie } from "./prototype-session"

describe("prototype session signing", () => {
  it("accepts a valid signed seeded identity", () => {
    const cookie = createPrototypeCookie("manager-sarah")
    expect(verifyPrototypeCookie(cookie)?.role).toBe("manager")
  })

  it("rejects missing, malformed and tampered cookies", () => {
    expect(verifyPrototypeCookie()).toBeUndefined()
    expect(verifyPrototypeCookie("invalid")).toBeUndefined()
    expect(verifyPrototypeCookie(`${createPrototypeCookie("doctor-anika")}tampered`)).toBeUndefined()
  })

  it("uses the doctor only as the safe display default", () => {
    expect(readPrototypeCookie()).toMatchObject({ id: "doctor-anika", role: "doctor" })
  })
})
