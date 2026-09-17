import type { WorkspaceState, WorkspaceUser } from "./types"

export function canOpenWorkspaceView(actor: WorkspaceUser, view: string, organisationId?: string, audience?: string) {
  if (view.startsWith("clinic-")) return actor.role === "manager" && actor.organisationId === organisationId
  if (view.startsWith("doctor-") || view === "inbox") return actor.role === "doctor"
  if (view === "approver") return actor.role === "approver"
  if (view === "finance") return actor.role === "finance"
  if (view === "operations") return actor.role === "operations"
  if (view === "onboarding") return audience === "doctor" ? actor.role === "doctor" : audience === "clinic" ? actor.role === "manager" : false
  return view === "engagement" || view === "offer"
}

export function authorisedWorkspaceState(state: WorkspaceState, actor: WorkspaceUser): WorkspaceState {
  const requirementIds = new Set(state.requirements.filter((item) => actor.role === "doctor" || actor.role === "operations" || item.organisationId === actor.organisationId).map((item) => item.id))
  const engagements = state.engagements.filter((item) => actor.role === "operations" || (actor.role === "doctor" ? item.doctorId === actor.id : requirementIds.has(item.requirementId)))
  const engagementIds = new Set(engagements.map((item) => item.id))
  const engagedDoctorIds = new Set(engagements.map((item) => item.doctorId))
  const conversations = state.conversations.filter((item) => item.participantIds.includes(actor.id))
  const conversationIds = new Set(conversations.map((item) => item.id))
  const offers = state.offers.filter((item) => engagementIds.has(item.engagementId))
  const bookings = state.bookings.filter((item) => actor.role === "operations" || actor.role === "finance" || (actor.role === "doctor" ? item.doctorId === actor.id : engagementIds.has(item.engagementId)))
  const bookingIds = new Set(bookings.map((item) => item.id))
  return {
    ...state,
    requirements: state.requirements.filter((item) => requirementIds.has(item.id)),
    engagements,
    offers,
    bookings,
    payments: state.payments.filter((item) => actor.role === "operations" || actor.role === "finance" || bookingIds.has(item.bookingId)),
    conversations,
    messages: state.messages.filter((item) => conversationIds.has(item.conversationId)),
    evidence: state.evidence.filter((item) => actor.role === "operations" || actor.role === "approver" || item.doctorId === actor.id || engagedDoctorIds.has(item.doctorId)),
    approvals: state.approvals.filter((item) => actor.role === "operations" || actor.role === "approver" || item.doctorId === actor.id || engagedDoctorIds.has(item.doctorId)),
    notifications: state.notifications.filter((item) => item.recipientId === actor.id),
    onboardingDrafts: state.onboardingDrafts.filter((item) => item.userId === actor.id),
    messageDrafts: Object.fromEntries(Object.entries(state.messageDrafts).filter(([key]) => key.startsWith(`${actor.id}:`))),
    auditEvents: actor.role === "operations" ? state.auditEvents : state.auditEvents.filter((item) => item.actorId === actor.id || engagementIds.has(item.recordId)),
    idempotency: {},
  }
}
