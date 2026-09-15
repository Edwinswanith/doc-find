export type WorkspaceRole = "doctor" | "manager" | "approver" | "finance" | "operations"

export type WorkspaceUser = {
  id: string
  name: string
  role: WorkspaceRole
  roleLabel: string
  initials: string
  organisationId?: string
  siteIds: string[]
}

export type Organisation = { id: string; name: string; legalName: string; status: "approved" | "pending"; version: number }
export type Site = { id: string; organisationId: string; name: string; area: string; scope: string[]; version: number }

export type AvailabilityState = "confirmed" | "partial" | "unknown" | "unavailable"
export type DoctorProfile = {
  id: string
  name: string
  initials: string
  specialty: string
  scopes: string[]
  baseArea: string
  travelRadiusMiles: number
  availabilityState: AvailabilityState
  availableOccurrenceIds: string[]
  availabilityConfirmedAt?: string
  expectedRateMinor: number
  experience: string
  evidenceSummary: string
  discoverable: boolean
  contactPreference: "messages_first" | "request_call" | "professional_phone"
  version: number
}

export type RequirementStatus = "draft" | "published" | "paused" | "closed" | "cancelled"
export type Requirement = {
  id: string
  organisationId: string
  siteId: string
  title: string
  specialty: string
  scope: string
  workload: string
  support: string
  occurrenceIds: string[]
  rateMinor: number
  currency: "GBP"
  status: RequirementStatus
  ownerId: string
  deadline: string
  version: number
}

export type OccurrenceState = "requested" | "booked" | "cancelled" | "completed" | "discrepancy"
export type SessionOccurrence = {
  id: string
  requirementId: string
  siteId: string
  startsAt: string
  endsAt: string
  timezone: "Europe/London"
  capacity: number
  reserved: number
  state: OccurrenceState
  requiredChecks: string[]
  version: number
}

export type RecruitmentStage = "invited" | "applied" | "shortlisted" | "in_discussion" | "offer_sent" | "terms_accepted" | "declined" | "withdrawn"
export type EngagementOrigin = "application" | "invitation"
export type CandidateEngagement = {
  id: string
  doctorId: string
  requirementId: string
  origins: EngagementOrigin[]
  stage: RecruitmentStage
  selectedOccurrenceIds: string[]
  ownerId: string
  lastContactAt?: string
  nextAction: string
  version: number
}

export type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "superseded" | "withdrawn"
export type OfferVersion = {
  id: string
  engagementId: string
  version: number
  status: OfferStatus
  occurrenceIds: string[]
  scope: string
  rateMinor: number
  totalMinor: number
  currency: "GBP"
  payer: string
  paymentTerms: string
  cancellationTerms: string
  conditions: string[]
  expiresAt: string
  sentAt?: string
  acceptedAt?: string
}

export type EvidenceRecord = {
  id: string
  doctorId: string
  category: "identity" | "registration" | "indemnity"
  status: "submitted" | "under_review" | "checked" | "correction_required" | "revoked"
  validUntil: string
  checkedAt?: string
  version: number
}

export type ApprovalRecord = {
  id: string
  doctorId: string
  siteId: string
  scope: string
  status: "requested" | "in_review" | "approved" | "declined" | "revoked"
  validUntil: string
  ownerId: string
  rationale?: string
  version: number
}

export type Booking = {
  id: string
  engagementId: string
  offerId: string
  doctorId: string
  occurrenceIds: string[]
  agreementState: "terms_accepted"
  createdAt: string
  version: number
}

export type PaymentRecord = {
  id: string
  bookingId: string
  state: "not_due" | "due" | "processing" | "paid" | "discrepancy"
  amountMinor: number
  invoiceReference?: string
  dueAt?: string
  version: number
}

export type WorkspaceMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  sentAt: string
  proposedRateMinor?: number
  seenBy: Record<string, string>
  delivery: "sent" | "failed"
}

export type WorkspaceConversation = {
  id: string
  engagementId: string
  participantIds: string[]
  version: number
}

export type Notification = {
  id: string
  recipientId: string
  category: "action" | "message" | "update"
  title: string
  detail: string
  href: string
  sourceId: string
  createdAt: string
  readAt?: string
}

export type OnboardingDraft = {
  id: string
  userId: string
  audience: "doctor" | "clinic"
  step: number
  status: "draft" | "review_pending" | "correction_required" | "approved"
  fields: Record<string, string>
  version: number
  updatedAt: string
}

export type AuditEvent = { id: string; actorId: string; action: string; recordId: string; version: number; at: string; detail: string }

export type WorkspaceState = {
  version: number
  users: WorkspaceUser[]
  organisations: Organisation[]
  sites: Site[]
  doctors: DoctorProfile[]
  requirements: Requirement[]
  occurrences: SessionOccurrence[]
  engagements: CandidateEngagement[]
  offers: OfferVersion[]
  evidence: EvidenceRecord[]
  approvals: ApprovalRecord[]
  bookings: Booking[]
  payments: PaymentRecord[]
  conversations: WorkspaceConversation[]
  messages: WorkspaceMessage[]
  notifications: Notification[]
  onboardingDrafts: OnboardingDraft[]
  messageDrafts: Record<string, string>
  auditEvents: AuditEvent[]
  idempotency: Record<string, { stateVersion: number; recordId: string; command: string }>
}

export type ReadinessResult = {
  state: "evidence_needed" | "approval_required" | "ready" | "blocked"
  blockers: string[]
}

export type DoctorSearchFilters = {
  specialty?: string
  location?: string
  occurrenceIds?: string[]
  maximumRateMinor?: number
}

export type DoctorSearchResult = DoctorProfile & { dateFit: "all" | "some" | "unknown" | "none"; matchedFacts: string[] }
