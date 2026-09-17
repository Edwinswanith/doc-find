import { describe, expect, it } from "vitest"
import { createWorkspaceFixture } from "./fixture"
import type { EngagementOrigin } from "./types"
import {
  acceptOfferCommand,
  applyToRequirement,
  calculateOccurrenceReadiness,
  classifyOccurrenceStaffing,
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

  it("falls back to the requirement's owning manager for clinical approval when no approver persona exists", () => {
    const state = createWorkspaceFixture()
    expect(state.users.some((user) => user.role === "approver")).toBe(false)

    const result = acceptOfferCommand(state, {
      actorId: "doctor-anika",
      offerId: "offer-anika-v2",
      expectedVersion: 2,
      now: new Date("2026-09-15T12:00:00.000Z"),
    })

    expect(result.approval?.ownerId).toBe("manager-sarah")
    expect(result.approval?.status).toBe("requested")
  })

  it("rejects acceptance by another doctor and stale versions", () => {
    const state = createWorkspaceFixture()

    expect(() => acceptOfferCommand(state, {
      actorId: "doctor-outsider",
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
    const applied = applyToRequirement(state, "doctor-newcomer", "req-harley-october", ["occ-20"])
    const existing = getOrReuseWorkspaceEngagement(applied.state, "doctor-newcomer", "req-harley-october", "invitation")

    expect(existing.created).toBe(false)
    expect(existing.engagement.id).toBe(applied.engagement.id)
    expect(existing.engagement.origins).toEqual(expect.arrayContaining(["application", "invitation"]))
  })

  it("persists only the selected occurrences when applying", () => {
    const state = createWorkspaceFixture()
    const result = applyToRequirement(state, "doctor-newcomer", "req-harley-october", ["occ-06", "occ-13"])

    expect(result.engagement.selectedOccurrenceIds).toEqual(["occ-06", "occ-13"])
    expect(result.engagement.origins).toContain("application")
  })

  it("does not let an application overwrite an engagement after terms have been sent", () => {
    const state = createWorkspaceFixture()

    expect(() => applyToRequirement(state, "doctor-anika", "req-harley-october", ["occ-06"])).toThrowError(/cannot be added/i)
  })

  it("filters doctors without treating unknown availability as available", () => {
    const state = createWorkspaceFixture()
    const withUnconfirmedDoctor = { ...state, doctors: [...state.doctors, { id: "doctor-unconfirmed", name: "Dr Unconfirmed Availability", initials: "UA", specialty: "Dermatology", scopes: ["Adult general dermatology"], baseArea: "London", travelRadiusMiles: 10, availabilityState: "unknown" as const, availableOccurrenceIds: [], expectedRateMinor: 60000, experience: "5 years", evidenceSummary: "Availability needs confirmation", discoverable: true, contactPreference: "messages_first" as const, version: 1 }] }
    const result = filterWorkspaceDoctors(withUnconfirmedDoctor, {
      specialty: "Dermatology",
      location: "London",
      occurrenceIds: ["occ-06", "occ-13"],
    })

    expect(result.map((doctor) => doctor.id)).toContain("doctor-anika")
    expect(result.find((doctor) => doctor.id === "doctor-unconfirmed")?.dateFit).toBe("unknown")
    expect(result.every((doctor) => doctor.specialty === "Dermatology")).toBe(true)
  })

  it("keeps coverage and readiness as independent calculations", () => {
    const state = createWorkspaceFixture()
    const coverage = requirementCoverage(state, "req-harley-october")
    const readiness = calculateOccurrenceReadiness(state, "doctor-anika", "occ-06")

    expect(coverage).toEqual({ booked: 0, total: 3, label: "0 of 3 sessions booked" })
    expect(readiness.state).toBe("approval_required")
    expect(readiness.blockers).toContain("Clinical approval is required for this site and scope.")
  })
})

describe("clinic calendar staffing classification", () => {
  const referenceNow = new Date("2026-09-17T09:00:00.000Z")

  it("reports a distant, untouched session as an open requirement, but still surfaces its pending offer", () => {
    const state = createWorkspaceFixture()
    const result = classifyOccurrenceStaffing(state, "occ-06", referenceNow)
    expect(result).toMatchObject({ status: "open", unfilled: 1, invitesPending: 0, applicationsPending: 0, offersPending: 1, confirmedDoctorIds: [] })
  })

  it("flags a distant session with a fresh application as awaiting review", () => {
    const state = createWorkspaceFixture()
    const withApplication = { ...state, engagements: [...state.engagements, { id: "eng-newcomer-harley", doctorId: "doctor-newcomer", requirementId: "req-harley-october", origins: ["application"] as EngagementOrigin[], stage: "applied" as const, selectedOccurrenceIds: ["occ-20"], ownerId: "manager-sarah", nextAction: "Review application", version: 1 }] }
    expect(classifyOccurrenceStaffing(withApplication, "occ-20", referenceNow).status).toBe("applications")
  })

  it("flags a distant session with an unanswered invitation as invite pending", () => {
    const state = createWorkspaceFixture()
    const withInvite = { ...state, engagements: [...state.engagements, { id: "eng-other-harley", doctorId: "doctor-other", requirementId: "req-harley-october", origins: ["invitation"] as EngagementOrigin[], stage: "invited" as const, selectedOccurrenceIds: ["occ-20"], ownerId: "manager-sarah", nextAction: "Doctor to respond", version: 1 }] }
    expect(classifyOccurrenceStaffing(withInvite, "occ-20", referenceNow).status).toBe("invited")
  })

  it("treats a fully reserved session as confirmed", () => {
    const state = createWorkspaceFixture()
    const fullyReserved = { ...state, occurrences: state.occurrences.map((item) => item.id === "occ-06" ? { ...item, reserved: 1, state: "booked" as const } : item) }
    expect(classifyOccurrenceStaffing(fullyReserved, "occ-06", referenceNow)).toMatchObject({ status: "confirmed", unfilled: 0 })
  })

  it("flags an unfilled session starting within 48 hours as action required, even without any candidate activity", () => {
    const state = createWorkspaceFixture()
    const soon = { ...state, occurrences: state.occurrences.map((item) => item.id === "occ-20" ? { ...item, startsAt: "2026-09-18T08:00:00.000Z", endsAt: "2026-09-18T12:00:00.000Z" } : item) }
    expect(classifyOccurrenceStaffing(soon, "occ-20", referenceNow).status).toBe("action_required")
  })

  it("flags a booked session whose end time has already passed as action required", () => {
    const state = createWorkspaceFixture()
    const overdue = { ...state, occurrences: state.occurrences.map((item) => item.id === "occ-06" ? { ...item, reserved: 1, state: "booked" as const, startsAt: "2026-09-10T08:00:00.000Z", endsAt: "2026-09-10T12:00:00.000Z" } : item) }
    expect(classifyOccurrenceStaffing(overdue, "occ-06", referenceNow).status).toBe("action_required")
  })

  it("flags a reported discrepancy as action required regardless of fill state", () => {
    const state = createWorkspaceFixture()
    const disputed = { ...state, occurrences: state.occurrences.map((item) => item.id === "occ-06" ? { ...item, reserved: 1, state: "discrepancy" as const } : item) }
    expect(classifyOccurrenceStaffing(disputed, "occ-06", referenceNow).status).toBe("action_required")
  })

  it("reports a finished session as completed", () => {
    const state = createWorkspaceFixture()
    const finished = { ...state, occurrences: state.occurrences.map((item) => item.id === "occ-06" ? { ...item, reserved: 1, state: "completed" as const } : item) }
    expect(classifyOccurrenceStaffing(finished, "occ-06", referenceNow).status).toBe("completed")
  })

  it("lists confirmed doctors from bookings that cover the session", () => {
    const state = createWorkspaceFixture()
    const booked = { ...state, occurrences: state.occurrences.map((item) => item.id === "occ-06" ? { ...item, reserved: 1, state: "booked" as const } : item), bookings: [...state.bookings, { id: "booking-anika-occ06", engagementId: "eng-anika-harley", offerId: "offer-anika-v2", doctorId: "doctor-anika", occurrenceIds: ["occ-06"], agreementState: "terms_accepted" as const, createdAt: referenceNow.toISOString(), version: 1 }] }
    expect(classifyOccurrenceStaffing(booked, "occ-06", referenceNow).confirmedDoctorIds).toEqual(["doctor-anika"])
  })
})
