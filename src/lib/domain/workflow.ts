export type CandidateEngagement = {
  id: string
  doctorId: string
  requirementId: string
  origin: "application" | "invitation"
  stage: "submitted" | "under_review" | "shortlisted" | "offer_issued" | "converted"
}

export type SessionOccurrence = {
  id: string
  siteId: string
  scope: string
  startsAt: string
  timezone: string
  capacity: number
  reserved: number
}

export type Offer = {
  id: string
  engagementId: string
  version: number
  status: "draft" | "sent" | "accepted" | "declined" | "expired" | "superseded" | "withdrawn"
  occurrenceIds: string[]
  expiresAt: string
}

export type EvidenceCategory = "identity" | "registration" | "indemnity"

export type Evidence = {
  category: EvidenceCategory
  status: "uploaded" | "under_review" | "checked" | "needs_correction" | "revoked"
  validUntil: string
}

export type Approval = {
  siteId: string
  scope: string
  status: "requested" | "in_review" | "approved" | "declined" | "revoked"
  validUntil: string
}

export type PhonePolicy = {
  mode: "hidden" | "request" | "verified_organisations"
  disclosedOrganisationIds: string[]
}

export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
  }
}

export function getOrReuseEngagement(
  current: CandidateEngagement[],
  doctorId: string,
  requirementId: string,
  origin: CandidateEngagement["origin"],
): { engagement: CandidateEngagement; created: boolean } {
  const existing = current.find(
    (engagement) => engagement.doctorId === doctorId && engagement.requirementId === requirementId,
  )
  if (existing) return { engagement: existing, created: false }

  return {
    engagement: {
      id: `eng-${doctorId}-${requirementId}`,
      doctorId,
      requirementId,
      origin,
      stage: origin === "application" ? "submitted" : "under_review",
    },
    created: true,
  }
}

export function acceptOffer(
  offer: Offer,
  expectedVersion: number,
  occurrences: SessionOccurrence[],
  now: Date,
) {
  if (offer.version !== expectedVersion) {
    throw new WorkflowError(
      `This offer has changed. Review version ${offer.version} before accepting.`,
      "STALE_OFFER",
    )
  }
  if (offer.status !== "sent") throw new WorkflowError("This offer is no longer open.", "OFFER_NOT_OPEN")
  if (new Date(offer.expiresAt) <= now) throw new WorkflowError("This offer has expired.", "OFFER_EXPIRED")

  const selected = occurrences.filter((item) => offer.occurrenceIds.includes(item.id))
  if (selected.length !== offer.occurrenceIds.length || selected.some((item) => item.reserved >= item.capacity)) {
    throw new WorkflowError("One or more selected sessions are no longer available.", "CAPACITY_UNAVAILABLE")
  }

  return {
    offer: { ...offer, status: "accepted" as const },
    occurrences: occurrences.map((item) =>
      offer.occurrenceIds.includes(item.id) ? { ...item, reserved: item.reserved + 1 } : item,
    ),
    booking: {
      offerId: offer.id,
      lifecycle: "confirmed" as const,
      readiness: "checks_outstanding" as const,
    },
  }
}

const REQUIRED_EVIDENCE: EvidenceCategory[] = ["identity", "registration", "indemnity"]

export function calculateReadiness(
  occurrence: SessionOccurrence,
  evidence: Evidence[],
  approvals: Approval[],
): { state: "ready_for_work" | "action_required"; blockers: string[] } {
  const blockers = REQUIRED_EVIDENCE.flatMap((category) => {
    const item = evidence.find((candidate) => candidate.category === category)
    const label = category.charAt(0).toUpperCase() + category.slice(1)
    if (!item || item.status !== "checked") return [`${label} evidence has not been checked.`]
    if (new Date(item.validUntil) <= new Date(occurrence.startsAt)) {
      return [`${label} evidence expires before this session.`]
    }
    return []
  })

  const approval = approvals.find(
    (item) =>
      item.siteId === occurrence.siteId &&
      item.scope === occurrence.scope &&
      item.status === "approved" &&
      new Date(item.validUntil) > new Date(occurrence.startsAt),
  )
  if (!approval) blockers.push("Clinical approval is required for this site and scope.")

  return blockers.length
    ? { state: "action_required", blockers }
    : { state: "ready_for_work", blockers: [] }
}

export function canViewProfessionalPhone(policy: PhonePolicy, organisationId: string): boolean {
  if (policy.mode === "hidden") return false
  if (policy.mode === "verified_organisations") return true
  return policy.disclosedOrganisationIds.includes(organisationId)
}
