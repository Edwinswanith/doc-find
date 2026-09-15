import { describe, expect, it } from "vitest"
import { createWorkspaceFixture } from "./fixture"
import {
  acceptOfferCommand,
  applyToRequirement,
  calculateOccurrenceReadiness,
  filterWorkspaceDoctors,
  getOrReuseWorkspaceEngagement,
  requirementCoverage,
  reviewOffer,
} from "./domain"

describe("Sapphire Workspace domain", () => {
  it("reviews an offer without mutating it", () => {
    const state = createWorkspaceFixture()
    const before = structuredClone(state)

    const result = reviewOffer(state, "offer-anika-v2", "doctor-anika")

    expect(result.offer.status).toBe("sent")
    expect(result.readiness.state).toBe("approval_required")
    expect(state).toEqual(before)
  })

  it("accepts the displayed offer version and reserves every selected occurrence", () => {
    const state = createWorkspaceFixture()

    const result = acceptOfferCommand(state, {
      actorId: "doctor-anika",
      offerId: "offer-anika-v2",
      expectedVersion: 2,
      now: new Date("2026-09-15T12:00:00.000Z"),
    })

    expect(result.state.offers.find((offer) => offer.id === "offer-anika-v2")?.status).toBe("accepted")
    expect(result.state.engagements.find((engagement) => engagement.id === "eng-anika-harley")?.stage).toBe("terms_accepted")
    expect(result.state.occurrences.filter((occurrence) => ["occ-06", "occ-13"].includes(occurrence.id)).every((occurrence) => occurrence.reserved === 1)).toBe(true)
    expect(result.readiness.state).toBe("approval_required")
  })

  it("rejects acceptance by another doctor and stale versions", () => {
    const state = createWorkspaceFixture()

    expect(() => acceptOfferCommand(state, {
      actorId: "doctor-theo",
      offerId: "offer-anika-v2",
      expectedVersion: 2,
      now: new Date("2026-09-15T12:00:00.000Z"),
    })).toThrowError(/not permitted/i)

    expect(() => acceptOfferCommand(state, {
      actorId: "doctor-anika",
      offerId: "offer-anika-v2",
      expectedVersion: 1,
      now: new Date("2026-09-15T12:00:00.000Z"),
    })).toThrowError(/changed/i)
  })

  it("reuses one engagement when an invitation reaches an existing applicant", () => {
    const state = createWorkspaceFixture()
    const existing = getOrReuseWorkspaceEngagement(state, "doctor-theo", "req-harley-october", "invitation")

    expect(existing.created).toBe(false)
    expect(existing.engagement.id).toBe("eng-theo-harley")
    expect(existing.engagement.origins).toEqual(expect.arrayContaining(["application", "invitation"]))
  })

  it("persists only the selected occurrences when applying", () => {
    const state = createWorkspaceFixture()
    const result = applyToRequirement(state, "doctor-daniel", "req-harley-october", ["occ-06", "occ-13"])

    expect(result.engagement.selectedOccurrenceIds).toEqual(["occ-06", "occ-13"])
    expect(result.engagement.origins).toContain("application")
  })

  it("does not let an application overwrite an engagement after terms have been sent", () => {
    const state = createWorkspaceFixture()

    expect(() => applyToRequirement(state, "doctor-anika", "req-harley-october", ["occ-06"])).toThrowError(/cannot be added/i)
  })

  it("filters doctors without treating unknown availability as available", () => {
    const state = createWorkspaceFixture()
    const result = filterWorkspaceDoctors(state, {
      specialty: "Dermatology",
      location: "London",
      occurrenceIds: ["occ-06", "occ-13"],
    })

    expect(result.map((doctor) => doctor.id)).toContain("doctor-anika")
    expect(result.find((doctor) => doctor.id === "doctor-daniel")?.dateFit).toBe("unknown")
    expect(result.every((doctor) => doctor.specialty === "Dermatology")).toBe(true)
  })

  it("keeps coverage and readiness as independent calculations", () => {
    const state = createWorkspaceFixture()
    const coverage = requirementCoverage(state, "req-harley-october")
    const readiness = calculateOccurrenceReadiness(state, "doctor-anika", "occ-06")

    expect(coverage).toEqual({ booked: 0, total: 3, label: "0 of 3 sessions booked" })
    expect(readiness.state).toBe("approval_required")
    expect(readiness.blockers).toContain("Site induction is outstanding.")
  })
})
