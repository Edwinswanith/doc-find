import { describe, expect, it } from "vitest"
import { createPrototypeCookie, defaultRouteForUser, verifyPrototypeCookie, verifyPrototypeCredentials } from "./prototype-session"

describe("prototype session signing", () => {
  it("accepts a valid signed seeded identity", async () => {
    const cookie = createPrototypeCookie("manager-sarah")
    expect((await verifyPrototypeCookie(cookie))?.role).toBe("manager")
  })

  it("rejects missing, malformed and tampered cookies", async () => {
    expect(await verifyPrototypeCookie()).toBeUndefined()
    expect(await verifyPrototypeCookie("invalid")).toBeUndefined()
    expect(await verifyPrototypeCookie(`${createPrototypeCookie("doctor-anika")}tampered`)).toBeUndefined()
  })
})

describe("prototype login credentials", () => {
  it("authenticates the seeded doctor and manager by email and password", () => {
    expect(verifyPrototypeCredentials("doctor@docfind.demo", "qwert@1234")).toMatchObject({ id: "doctor-anika", role: "doctor" })
    expect(verifyPrototypeCredentials("clinic@docfind.demo", "qwert@1234")).toMatchObject({ id: "manager-sarah", role: "manager" })
  })

  it("is case-insensitive on email but not on password", () => {
    expect(verifyPrototypeCredentials("Doctor@DocFind.Demo", "qwert@1234")).toMatchObject({ id: "doctor-anika" })
    expect(verifyPrototypeCredentials("doctor@docfind.demo", "qwert@1234extra")).toBeUndefined()
  })

  it("rejects unknown emails and wrong passwords", () => {
    expect(verifyPrototypeCredentials("nobody@docfind.demo", "qwert@1234")).toBeUndefined()
    expect(verifyPrototypeCredentials("doctor@docfind.demo", "wrong-password")).toBeUndefined()
  })
})

describe("default route resolution", () => {
  it("sends each role to its own workspace", () => {
    expect(defaultRouteForUser({ id: "doctor-anika", role: "doctor" } as never)).toBe("/doctor/today")
    expect(defaultRouteForUser({ id: "manager-sarah", role: "manager", organisationId: "org-harley" } as never)).toBe("/clinic/org-harley/today")
  })
})
