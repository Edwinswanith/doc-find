import { describe, expect, it } from "vitest"
import {
  acceptOffer,
  calculateReadiness,
  canViewProfessionalPhone,
  getOrReuseEngagement,
  type Approval,
  type CandidateEngagement,
  type Evidence,
  type Offer,
  type SessionOccurrence,
} from "./workflow"

const occurrence: SessionOccurrence = {
  id: "session-1",
  siteId: "site-harley",
  scope: "Dermatology outpatient clinic",
  startsAt: "2026-10-06T08:00:00.000Z",
  timezone: "Europe/London",
  capacity: 1,
  reserved: 0,
}

const offer: Offer = {
  id: "offer-2",
  engagementId: "eng-1",
  version: 2,
  status: "sent",
  occurrenceIds: [occurrence.id],
  expiresAt: "2026-10-01T12:00:00.000Z",
}

describe("candidate engagement identity", () => {
  it("reuses an existing application when the same doctor is invited", () => {
    const current: CandidateEngagement[] = [{
      id: "eng-1",
      doctorId: "doctor-anika",
      requirementId: "req-derm",
      origin: "application",
      stage: "under_review",
    }]

    const result = getOrReuseEngagement(current, "doctor-anika", "req-derm", "invitation")

    expect(result.engagement.id).toBe("eng-1")
    expect(result.created).toBe(false)
    expect(result.engagement.origin).toBe("application")
  })

  it("creates a new engagement when no live record exists", () => {
    const result = getOrReuseEngagement([], "doctor-new", "req-new", "invitation")
    expect(result.created).toBe(true)
    expect(result.engagement.stage).toBe("under_review")
  })
})

describe("offer acceptance", () => {
  it("rejects a stale offer version", () => {
    expect(() => acceptOffer(offer, 1, [occurrence], new Date("2026-09-20"))).toThrowError(
      "This offer has changed. Review version 2 before accepting.",
    )
  })

  it("rejects acceptance when the last position has been reserved", () => {
    expect(() => acceptOffer(offer, 2, [{ ...occurrence, reserved: 1 }], new Date("2026-09-20"))).toThrowError(
      "One or more selected sessions are no longer available.",
    )
  })

  it("reserves capacity without marking the booking ready", () => {
    const result = acceptOffer(offer, 2, [occurrence], new Date("2026-09-20"))

    expect(result.offer.status).toBe("accepted")
    expect(result.occurrences[0].reserved).toBe(1)
    expect(result.booking.readiness).toBe("checks_outstanding")
  })

  it("rejects expired and unavailable offers", () => {
    expect(() => acceptOffer(offer, 2, [occurrence], new Date("2026-10-02"))).toThrowError("This offer has expired.")
    expect(() => acceptOffer({ ...offer, status: "withdrawn" }, 2, [occurrence], new Date("2026-09-20"))).toThrowError("This offer is no longer open.")
  })

  it("rejects an offer whose occurrence cannot be found", () => {
    expect(() => acceptOffer(offer, 2, [], new Date("2026-09-20"))).toThrowError("One or more selected sessions are no longer available.")
  })
})

describe("engagement readiness", () => {
  const approval: Approval = {
    siteId: occurrence.siteId,
    scope: occurrence.scope,
    status: "approved",
    validUntil: "2026-12-31T23:59:59.000Z",
  }
  const evidence: Evidence[] = [
    { category: "identity", status: "checked", validUntil: "2027-01-01T00:00:00.000Z" },
    { category: "registration", status: "checked", validUntil: "2027-01-01T00:00:00.000Z" },
    { category: "indemnity", status: "checked", validUntil: "2027-01-01T00:00:00.000Z" },
  ]

  it("is ready only with current evidence and matching site/scope approval", () => {
    expect(calculateReadiness(occurrence, evidence, [approval])).toEqual({
      state: "ready_for_work",
      blockers: [],
    })
  })

  it("does not inherit approval from another site", () => {
    const result = calculateReadiness(occurrence, evidence, [{ ...approval, siteId: "site-chelsea" }])
    expect(result.state).toBe("action_required")
    expect(result.blockers).toContain("Clinical approval is required for this site and scope.")
  })

  it("blocks a future session when evidence expires before it starts", () => {
    const result = calculateReadiness(occurrence, [
      ...evidence.slice(0, 2),
      { category: "indemnity", status: "checked", validUntil: "2026-10-01T00:00:00.000Z" },
    ], [approval])
    expect(result.blockers).toContain("Indemnity evidence expires before this session.")
  })

  it("reports missing and unchecked evidence precisely", () => {
    const result = calculateReadiness(occurrence, [
      { category: "identity", status: "under_review", validUntil: "2027-01-01T00:00:00.000Z" },
    ], [approval])
    expect(result.blockers).toContain("Identity evidence has not been checked.")
    expect(result.blockers).toContain("Registration evidence has not been checked.")
  })
})

describe("contact privacy", () => {
  it("requires explicit disclosure to the requesting organisation", () => {
    expect(canViewProfessionalPhone({ mode: "request", disclosedOrganisationIds: [] }, "org-one")).toBe(false)
    expect(canViewProfessionalPhone({ mode: "request", disclosedOrganisationIds: ["org-one"] }, "org-one")).toBe(true)
    expect(canViewProfessionalPhone({ mode: "request", disclosedOrganisationIds: ["org-one"] }, "org-two")).toBe(false)
  })

  it("supports hidden and verified-organisation policies", () => {
    expect(canViewProfessionalPhone({ mode: "hidden", disclosedOrganisationIds: ["org-one"] }, "org-one")).toBe(false)
    expect(canViewProfessionalPhone({ mode: "verified_organisations", disclosedOrganisationIds: [] }, "org-one")).toBe(true)
  })
})
