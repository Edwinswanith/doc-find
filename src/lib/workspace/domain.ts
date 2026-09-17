import type {
  CandidateEngagement,
  DoctorSearchFilters,
  DoctorSearchResult,
  EngagementOrigin,
  ReadinessResult,
  WorkspaceState,
} from "./types"

export class WorkspaceDomainError extends Error {
  constructor(message: string, public readonly code: string, public readonly currentVersion?: number) {
    super(message)
  }
}

export function getOrReuseWorkspaceEngagement(
  state: WorkspaceState,
  doctorId: string,
  requirementId: string,
  origin: EngagementOrigin,
): { engagement: CandidateEngagement; created: boolean } {
  const existing = state.engagements.find((item) => item.doctorId === doctorId && item.requirementId === requirementId)
  if (existing) {
    return {
      engagement: { ...existing, origins: existing.origins.includes(origin) ? existing.origins : [...existing.origins, origin] },
      created: false,
    }
  }
  return {
    engagement: {
      id: `eng-${doctorId}-${requirementId}`,
      doctorId,
      requirementId,
      origins: [origin],
      stage: origin === "application" ? "applied" : "invited",
      selectedOccurrenceIds: [],
      ownerId: state.requirements.find((item) => item.id === requirementId)?.ownerId ?? "unassigned",
      nextAction: origin === "application" ? "Review application" : "Doctor to respond",
      version: 1,
    },
    created: true,
  }
}

export function applyToRequirement(state: WorkspaceState, doctorId: string, requirementId: string, occurrenceIds: string[]) {
  const requirement = state.requirements.find((item) => item.id === requirementId && item.status === "published")
  if (!requirement) throw new WorkspaceDomainError("This vacancy is not open for applications.", "REQUIREMENT_NOT_OPEN")
  if (!occurrenceIds.length || occurrenceIds.some((id) => !requirement.occurrenceIds.includes(id))) {
    throw new WorkspaceDomainError("Choose one or more valid vacancy dates.", "INVALID_OCCURRENCES")
  }
  const current = state.engagements.find((item) => item.doctorId === doctorId && item.requirementId === requirementId)
  if (current && current.stage !== "invited" && current.stage !== "applied") {
    throw new WorkspaceDomainError(`An application cannot be added while this engagement is ${current.stage.replaceAll("_", " ")}.`, "INVALID_TRANSITION", current.version)
  }
  const reused = getOrReuseWorkspaceEngagement(state, doctorId, requirementId, "application")
  const engagement = { ...reused.engagement, selectedOccurrenceIds: [...new Set(occurrenceIds)], version: reused.created ? 1 : reused.engagement.version + 1 }
  return {
    state: {
      ...state,
      version: state.version + 1,
      engagements: reused.created ? [...state.engagements, engagement] : state.engagements.map((item) => item.id === engagement.id ? engagement : item),
    },
    engagement,
  }
}

export function requirementCoverage(state: WorkspaceState, requirementId: string) {
  const requirement = state.requirements.find((item) => item.id === requirementId)
  if (!requirement) throw new WorkspaceDomainError("Requirement not found.", "NOT_FOUND")
  const occurrences = state.occurrences.filter((item) => requirement.occurrenceIds.includes(item.id))
  const booked = occurrences.filter((item) => item.reserved >= item.capacity || item.state === "booked").length
  return { booked, total: occurrences.length, label: `${booked} of ${occurrences.length} sessions booked` }
}

export type CalendarItemStatus = "open" | "applications" | "invited" | "confirmed" | "action_required" | "completed"

export type OccurrenceStaffing = {
  status: CalendarItemStatus
  unfilled: number
  invitesPending: number
  applicationsPending: number
  offersPending: number
  confirmedDoctorIds: string[]
}

// Urgency is judged from the session's own start time, not from when the calling code happens to
// run -- passing `now` explicitly (rather than reading Date.now() inside) keeps this pure and lets
// tests pin a reference instant instead of racing the wall clock.
export function classifyOccurrenceStaffing(state: WorkspaceState, occurrenceId: string, now: Date = new Date()): OccurrenceStaffing {
  const occurrence = state.occurrences.find((item) => item.id === occurrenceId)
  if (!occurrence) throw new WorkspaceDomainError("Session occurrence not found.", "NOT_FOUND")
  const engagements = state.engagements.filter((item) => item.requirementId === occurrence.requirementId && item.selectedOccurrenceIds.includes(occurrenceId))
  const invitesPending = engagements.filter((item) => item.origins.includes("invitation") && item.stage === "invited").length
  const applicationsPending = engagements.filter((item) => item.stage === "applied").length
  const offersPending = state.offers.filter((item) => item.occurrenceIds.includes(occurrenceId) && item.status === "sent").length
  const confirmedDoctorIds = state.bookings.filter((item) => item.occurrenceIds.includes(occurrenceId)).map((item) => item.doctorId)
  const unfilled = Math.max(0, occurrence.capacity - occurrence.reserved)
  const hoursUntilStart = (new Date(occurrence.startsAt).getTime() - now.getTime()) / 3600000
  const shiftEnded = new Date(occurrence.endsAt).getTime() <= now.getTime()

  let status: CalendarItemStatus
  if (occurrence.state === "discrepancy") status = "action_required"
  else if (occurrence.state === "completed") status = "completed"
  else if (occurrence.state === "booked" && shiftEnded) status = "action_required"
  else if (unfilled <= 0) status = "confirmed"
  else if (hoursUntilStart <= 48) status = "action_required"
  else if (applicationsPending > 0) status = "applications"
  else if (invitesPending > 0) status = "invited"
  else status = "open"

  return { status, unfilled, invitesPending, applicationsPending, offersPending, confirmedDoctorIds }
}

export function calculateOccurrenceReadiness(state: WorkspaceState, doctorId: string, occurrenceId: string): ReadinessResult {
  const occurrence = state.occurrences.find((item) => item.id === occurrenceId)
  if (!occurrence) throw new WorkspaceDomainError("Session occurrence not found.", "NOT_FOUND")
  const requirement = state.requirements.find((item) => item.id === occurrence.requirementId)
  if (!requirement) throw new WorkspaceDomainError("Requirement not found.", "NOT_FOUND")
  const evidenceCategories = ["identity", "registration", "indemnity"] as const
  const blockers: string[] = []
  for (const category of evidenceCategories) {
    const evidence = state.evidence.find((item) => item.doctorId === doctorId && item.category === category)
    if (!evidence || evidence.status !== "checked") blockers.push(`${category[0].toUpperCase()}${category.slice(1)} evidence has not been checked.`)
    else if (new Date(evidence.validUntil) <= new Date(occurrence.startsAt)) blockers.push(`${category[0].toUpperCase()}${category.slice(1)} evidence expires before this session.`)
  }
  if (occurrence.requiredChecks.includes("site_induction")) blockers.push("Site induction is outstanding.")
  const approval = state.approvals.find((item) => item.doctorId === doctorId && item.siteId === occurrence.siteId && item.scope === requirement.scope && item.status === "approved" && new Date(item.validUntil) > new Date(occurrence.startsAt))
  if (!approval) blockers.push("Clinical approval is required for this site and scope.")
  if (!blockers.length) return { state: "ready", blockers: [] }
  if (blockers.some((item) => item.includes("evidence"))) return { state: "evidence_needed", blockers }
  if (blockers.some((item) => item.includes("approval") || item.includes("induction"))) return { state: "approval_required", blockers }
  return { state: "blocked", blockers }
}

export function reviewOffer(state: WorkspaceState, offerId: string, actorId: string) {
  const offer = state.offers.find((item) => item.id === offerId)
  if (!offer) throw new WorkspaceDomainError("Offer not found.", "NOT_FOUND")
  const engagement = state.engagements.find((item) => item.id === offer.engagementId)
  if (!engagement) throw new WorkspaceDomainError("Engagement not found.", "NOT_FOUND")
  const actor = state.users.find((item) => item.id === actorId)
  const requirement = state.requirements.find((item) => item.id === engagement.requirementId)
  if (!actor || !requirement || (actor.role === "doctor" ? engagement.doctorId !== actor.id : actor.organisationId !== requirement.organisationId)) {
    throw new WorkspaceDomainError("You are not permitted to view this offer.", "FORBIDDEN")
  }
  return {
    offer: structuredClone(offer),
    engagement: structuredClone(engagement),
    requirement: structuredClone(requirement),
    occurrences: state.occurrences.filter((item) => offer.occurrenceIds.includes(item.id)).map((item) => structuredClone(item)),
    readiness: calculateOccurrenceReadiness(state, engagement.doctorId, offer.occurrenceIds[0]),
  }
}

export function acceptOfferCommand(state: WorkspaceState, input: { actorId: string; offerId: string; expectedVersion: number; now: Date }) {
  const offer = state.offers.find((item) => item.id === input.offerId)
  if (!offer) throw new WorkspaceDomainError("Offer not found.", "NOT_FOUND")
  const engagement = state.engagements.find((item) => item.id === offer.engagementId)
  if (!engagement || engagement.doctorId !== input.actorId) throw new WorkspaceDomainError("You are not permitted to accept this offer.", "FORBIDDEN")
  if (offer.version !== input.expectedVersion) throw new WorkspaceDomainError(`This offer has changed. Review version ${offer.version}.`, "VERSION_CONFLICT", offer.version)
  if (offer.status !== "sent") throw new WorkspaceDomainError("This offer is no longer open.", "OFFER_NOT_OPEN", offer.version)
  if (new Date(offer.expiresAt) <= input.now) throw new WorkspaceDomainError("This offer has expired.", "OFFER_EXPIRED", offer.version)
  const selected = state.occurrences.filter((item) => offer.occurrenceIds.includes(item.id))
  if (selected.length !== offer.occurrenceIds.length || selected.some((item) => item.reserved >= item.capacity)) throw new WorkspaceDomainError("One or more sessions are no longer available.", "CAPACITY_UNAVAILABLE", offer.version)
  const now = input.now.toISOString()
  const nextOffer = { ...offer, status: "accepted" as const, acceptedAt: now }
  const nextEngagement = { ...engagement, stage: "terms_accepted" as const, nextAction: "Complete readiness checks", version: engagement.version + 1 }
  const requirement = state.requirements.find((item) => item.id === engagement.requirementId)
  const existingApproval = requirement && state.approvals.find((item) => item.doctorId === engagement.doctorId && item.siteId === requirement.siteId && item.scope === offer.scope)
  // A dedicated "approver" persona takes clinical-approval requests when one exists for the
  // organisation. Nothing in this demo currently seeds one, so without a fallback the request would
  // simply never be created and readiness could never leave "approval required" for anyone -- the
  // clinic's own manager (the requirement owner) is the next most sensible owner in that case.
  const approver = requirement && !existingApproval && (state.users.find((item) => item.role === "approver" && item.organisationId === requirement.organisationId) ?? state.users.find((item) => item.id === requirement.ownerId))
  const newApproval = approver && requirement ? { id: `approval-${crypto.randomUUID()}`, doctorId: engagement.doctorId, siteId: requirement.siteId, scope: offer.scope, status: "requested" as const, validUntil: new Date(input.now.getTime() + 365 * 86400000).toISOString(), ownerId: approver.id, version: 1 } : undefined
  const nextState: WorkspaceState = {
    ...state,
    version: state.version + 1,
    offers: state.offers.map((item) => item.id === offer.id ? nextOffer : item),
    engagements: state.engagements.map((item) => item.id === engagement.id ? nextEngagement : item),
    occurrences: state.occurrences.map((item) => offer.occurrenceIds.includes(item.id) ? { ...item, reserved: item.reserved + 1, state: "booked" as const, version: item.version + 1 } : item),
    bookings: [...state.bookings, { id: `booking-${offer.id}`, engagementId: engagement.id, offerId: offer.id, doctorId: engagement.doctorId, occurrenceIds: offer.occurrenceIds, agreementState: "terms_accepted", createdAt: now, version: 1 }],
    approvals: newApproval ? [...state.approvals, newApproval] : state.approvals,
    auditEvents: [
      ...state.auditEvents,
      { id: `audit-${crypto.randomUUID()}`, actorId: input.actorId, action: "accept-offer", recordId: offer.id, version: offer.version, at: now, detail: `Accepted offer version ${offer.version}` },
      ...(newApproval ? [{ id: `audit-${crypto.randomUUID()}`, actorId: input.actorId, action: "request-approval", recordId: newApproval.id, version: newApproval.version, at: now, detail: `Clinical approval requested for ${newApproval.scope} at ${requirement?.siteId}` }] : []),
    ],
  }
  return { state: nextState, offer: nextOffer, approval: newApproval, readiness: calculateOccurrenceReadiness(nextState, engagement.doctorId, offer.occurrenceIds[0]) }
}

export function filterWorkspaceDoctors(state: WorkspaceState, filters: DoctorSearchFilters): DoctorSearchResult[] {
  return state.doctors.filter((doctor) => doctor.discoverable)
    .filter((doctor) => !filters.specialty || doctor.specialty.toLowerCase() === filters.specialty.toLowerCase())
    .filter((doctor) => !filters.location || doctor.baseArea.toLowerCase().includes(filters.location.toLowerCase()) || filters.location.toLowerCase().includes("london"))
    .filter((doctor) => !filters.maximumRateMinor || doctor.expectedRateMinor <= filters.maximumRateMinor)
    .map((doctor) => {
      const requested = filters.occurrenceIds ?? []
      const matching = requested.filter((id) => doctor.availableOccurrenceIds.includes(id)).length
      const dateFit = doctor.availabilityState === "unknown" ? "unknown" as const : !requested.length || matching === requested.length ? "all" as const : matching > 0 ? "some" as const : "none" as const
      const matchedFacts = [doctor.specialty, doctor.baseArea, dateFit === "unknown" ? "Availability needs confirmation" : `${matching} of ${requested.length || doctor.availableOccurrenceIds.length} requested dates`]
      return { ...doctor, dateFit, matchedFacts }
    })
}
