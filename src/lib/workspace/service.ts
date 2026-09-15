import "server-only"
import { randomUUID } from "node:crypto"
import { acceptOfferCommand, applyToRequirement, getOrReuseWorkspaceEngagement, WorkspaceDomainError } from "./domain"
import { getWorkspaceState, saveWorkspaceState } from "./store"
import type { CandidateEngagement, RecruitmentStage, WorkspaceState, WorkspaceUser } from "./types"

export type WorkspaceCommand = {
  command: "publish" | "apply" | "invite" | "shortlist" | "start-discussion" | "send-offer" | "accept-offer" | "decline-offer" | "approve-scope" | "mark-complete" | "submit-invoice" | "confirm-payment"
  recordId: string
  expectedVersion: number
  idempotencyKey: string
  payload?: Record<string, unknown>
}

function user(state: WorkspaceState, actorId: string): WorkspaceUser {
  const actor = state.users.find((item) => item.id === actorId)
  if (!actor) throw new WorkspaceDomainError("Your prototype session is no longer valid.", "UNAUTHENTICATED")
  return actor
}

function audit(state: WorkspaceState, actorId: string, action: string, recordId: string, detail: string) {
  return { ...state, auditEvents: [...state.auditEvents, { id: `audit-${randomUUID()}`, actorId, action, recordId, version: state.version, at: new Date().toISOString(), detail }] }
}

export async function executeWorkspaceCommand(actorId: string, input: WorkspaceCommand) {
  const state = await getWorkspaceState()
  const actor = user(state, actorId)
  const key = `${actorId}:${input.command}:${input.idempotencyKey}`
  if (state.idempotency[key]) return { state, replayed: true, recordId: state.idempotency[key].recordId }
  let next = state
  let recordId = input.recordId

  if (input.command === "publish") {
    if (actor.role !== "manager" || !actor.organisationId) throw new WorkspaceDomainError("Only a clinic manager can publish a vacancy.", "FORBIDDEN")
    const siteId = String(input.payload?.siteId || "")
    const site = state.sites.find((item) => item.id === siteId && item.organisationId === actor.organisationId && actor.siteIds.includes(item.id))
    const title = String(input.payload?.title || "").trim(); const scope = String(input.payload?.scope || "").trim(); const rateMinor = Number(input.payload?.rateMinor)
    const startsAtValues = Array.isArray(input.payload?.startsAt) ? input.payload.startsAt.filter((value): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value))) : []
    if (!site || !title || !scope || !Number.isInteger(rateMinor) || rateMinor < 10000 || !startsAtValues.length) throw new WorkspaceDomainError("Complete the site, title, scope, rate and at least one valid date.", "INVALID_COMMAND")
    const suffix = randomUUID(); const requirementId = `req-${suffix}`
    const occurrenceIds = startsAtValues.map((_, index) => `occ-${suffix}-${index + 1}`)
    const requirement = { id: requirementId, organisationId: actor.organisationId, siteId, title, specialty: "Dermatology", scope, workload: String(input.payload?.workload || "Four-hour outpatient clinic"), support: String(input.payload?.support || "Clinic nurse and administration support"), occurrenceIds, rateMinor, currency: "GBP" as const, status: "published" as const, ownerId: actor.id, deadline: String(input.payload?.deadline || new Date(Date.now() + 14 * 86400000).toISOString()), version: 1 }
    const occurrences = startsAtValues.map((startsAt, index) => ({ id: occurrenceIds[index], requirementId, siteId, startsAt, endsAt: new Date(new Date(startsAt).getTime() + 4 * 3600000).toISOString(), timezone: "Europe/London" as const, capacity: 1, reserved: 0, state: "requested" as const, requiredChecks: ["clinical_approval"], version: 1 }))
    next = { ...state, version: state.version + 1, requirements: [...state.requirements, requirement], occurrences: [...state.occurrences, ...occurrences] }
    next = audit(next, actor.id, "publish", requirementId, `Published ${title} with ${occurrences.length} occurrence(s)`)
    recordId = requirementId
  } else if (input.command === "accept-offer") {
    const result = acceptOfferCommand(state, { actorId, offerId: input.recordId, expectedVersion: input.expectedVersion, now: new Date() })
    const engagement = result.state.engagements.find((item) => item.id === result.offer.engagementId)
    next = engagement ? { ...result.state, notifications: [...result.state.notifications, { id: `notification-${randomUUID()}`, recipientId: engagement.ownerId, category: "action", title: `${actor.name} accepted the offer`, detail: `Offer version ${result.offer.version}; readiness remains separate`, href: `/engagements/${engagement.id}`, sourceId: result.offer.id, createdAt: new Date().toISOString() }] } : result.state
  } else if (input.command === "apply") {
    if (actor.role !== "doctor") throw new WorkspaceDomainError("Only a doctor can apply for this vacancy.", "FORBIDDEN")
    const ids = Array.isArray(input.payload?.occurrenceIds) ? input.payload.occurrenceIds.filter((value): value is string => typeof value === "string") : []
    const result = applyToRequirement(state, actor.id, input.recordId, ids)
    next = result.state
    if (!next.conversations.some((item) => item.engagementId === result.engagement.id)) next = { ...next, conversations: [...next.conversations, { id: `conversation-${result.engagement.id}`, engagementId: result.engagement.id, participantIds: [actor.id, result.engagement.ownerId], version: 1 }] }
    next = { ...next, notifications: [...next.notifications, { id: `notification-${randomUUID()}`, recipientId: result.engagement.ownerId, category: "action", title: `${actor.name} applied`, detail: `${ids.length} selected occurrence(s)`, href: `/engagements/${result.engagement.id}`, sourceId: result.engagement.id, createdAt: new Date().toISOString() }] }
    next = audit(next, actor.id, "apply", result.engagement.id, `Applied for ${ids.length} selected occurrence(s)`)
    recordId = result.engagement.id
  } else if (input.command === "invite") {
    if (actor.role !== "manager") throw new WorkspaceDomainError("Only a clinic manager can invite a doctor.", "FORBIDDEN")
    const doctorId = String(input.payload?.doctorId || "")
    const requirement = state.requirements.find((item) => item.id === input.recordId && item.organisationId === actor.organisationId)
    if (!requirement) throw new WorkspaceDomainError("You are not permitted to invite for this vacancy.", "FORBIDDEN")
    if (!state.doctors.some((item) => item.id === doctorId && item.discoverable)) throw new WorkspaceDomainError("This doctor is not available for direct invitations.", "INVALID_COMMAND")
    const reused = getOrReuseWorkspaceEngagement(state, doctorId, requirement.id, "invitation")
    const engagement = { ...reused.engagement, selectedOccurrenceIds: reused.engagement.selectedOccurrenceIds.length ? reused.engagement.selectedOccurrenceIds : requirement.occurrenceIds, version: reused.created ? 1 : reused.engagement.version + 1 }
    next = { ...state, version: state.version + 1, engagements: reused.created ? [...state.engagements, engagement] : state.engagements.map((item) => item.id === engagement.id ? engagement : item) }
    if (!next.conversations.some((item) => item.engagementId === engagement.id)) next = { ...next, conversations: [...next.conversations, { id: `conversation-${engagement.id}`, engagementId: engagement.id, participantIds: [doctorId, actor.id], version: 1 }] }
    next = { ...next, notifications: [...next.notifications, { id: `notification-${randomUUID()}`, recipientId: doctorId, category: "action", title: `${actor.name} invited you`, detail: requirement.title, href: `/engagements/${engagement.id}`, sourceId: engagement.id, createdAt: new Date().toISOString() }] }
    next = audit(next, actor.id, "invite", engagement.id, reused.created ? "Direct invitation created" : "Invitation merged into existing engagement")
    recordId = engagement.id
  } else if (input.command === "send-offer") {
    const engagement = state.engagements.find((item) => item.id === input.recordId)
    const requirement = state.requirements.find((item) => item.id === engagement?.requirementId)
    if (!engagement || !requirement || actor.role !== "manager" || actor.organisationId !== requirement.organisationId) throw new WorkspaceDomainError("You are not permitted to offer terms for this candidate.", "FORBIDDEN")
    if (engagement.version !== input.expectedVersion) throw new WorkspaceDomainError("This candidate record changed. Refresh before sending terms.", "VERSION_CONFLICT", engagement.version)
    if (engagement.stage !== "in_discussion" && engagement.stage !== "shortlisted") throw new WorkspaceDomainError("Start a discussion before sending structured terms.", "INVALID_TRANSITION", engagement.version)
    const occurrenceIds = Array.isArray(input.payload?.occurrenceIds) ? input.payload.occurrenceIds.filter((value): value is string => typeof value === "string") : engagement.selectedOccurrenceIds
    const rateMinor = Number(input.payload?.rateMinor || requirement.rateMinor)
    if (!occurrenceIds.length || occurrenceIds.some((id) => !requirement.occurrenceIds.includes(id)) || !Number.isInteger(rateMinor) || rateMinor < 10000) throw new WorkspaceDomainError("Choose valid dates and a session rate before sending.", "INVALID_COMMAND", engagement.version)
    const version = Math.max(0, ...state.offers.filter((item) => item.engagementId === engagement.id).map((item) => item.version)) + 1
    const now = new Date(); const offer = { id: `offer-${randomUUID()}`, engagementId: engagement.id, version, status: "sent" as const, occurrenceIds, scope: requirement.scope, rateMinor, totalMinor: rateMinor * occurrenceIds.length, currency: "GBP" as const, payer: state.organisations.find((item) => item.id === requirement.organisationId)?.legalName ?? "Clinic organisation", paymentTerms: String(input.payload?.paymentTerms || "Payment due within 30 days of invoice"), cancellationTerms: String(input.payload?.cancellationTerms || "Seven days' notice by either party"), conditions: ["Scoped clinical approval"], expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(), sentAt: now.toISOString() }
    next = { ...state, version: state.version + 1, offers: [...state.offers.map((item) => item.engagementId === engagement.id && item.status === "sent" ? { ...item, status: "superseded" as const } : item), offer], engagements: state.engagements.map((item) => item.id === engagement.id ? { ...item, stage: "offer_sent" as const, nextAction: "Awaiting doctor's decision", version: item.version + 1 } : item), notifications: [...state.notifications, { id: `notification-${randomUUID()}`, recipientId: engagement.doctorId, category: "action", title: "Offer ready to review", detail: `${requirement.title} · version ${version}`, href: `/offers/${offer.id}`, sourceId: offer.id, createdAt: now.toISOString() }] }
    next = audit(next, actor.id, "send-offer", offer.id, `Sent offer version ${version} for ${occurrenceIds.length} occurrence(s)`)
    recordId = offer.id
  } else if (input.command === "decline-offer") {
    const offer = state.offers.find((item) => item.id === input.recordId)
    const engagement = state.engagements.find((item) => item.id === offer?.engagementId)
    if (!offer || !engagement || actor.role !== "doctor" || engagement.doctorId !== actor.id) throw new WorkspaceDomainError("You are not permitted to decline this offer.", "FORBIDDEN")
    if (offer.version !== input.expectedVersion) throw new WorkspaceDomainError("This offer has changed. Review the current version.", "VERSION_CONFLICT", offer.version)
    if (offer.status !== "sent") throw new WorkspaceDomainError("This offer is no longer open.", "OFFER_NOT_OPEN", offer.version)
    next = { ...state, version: state.version + 1, offers: state.offers.map((item) => item.id === offer.id ? { ...item, status: "declined" as const } : item), engagements: state.engagements.map((item) => item.id === engagement.id ? { ...item, stage: "declined" as const, version: item.version + 1, nextAction: "No further action" } : item) }
    next = audit(next, actor.id, "decline-offer", offer.id, `Declined offer version ${offer.version}`)
  } else if (input.command === "approve-scope") {
    const approval = state.approvals.find((item) => item.id === input.recordId)
    if (!approval || actor.role !== "approver" || approval.ownerId !== actor.id) throw new WorkspaceDomainError("You are not permitted to approve this scope.", "FORBIDDEN")
    if (approval.version !== input.expectedVersion) throw new WorkspaceDomainError("This approval changed. Refresh to continue.", "VERSION_CONFLICT", approval.version)
    next = { ...state, version: state.version + 1, approvals: state.approvals.map((item) => item.id === approval.id ? { ...item, status: "approved" as const, rationale: String(input.payload?.rationale || "Evidence reviewed for the named site and scope"), version: item.version + 1 } : item) }
    next = audit(next, actor.id, "approve-scope", approval.id, `Approved ${approval.scope} at ${approval.siteId}`)
  } else if (input.command === "mark-complete") {
    const occurrence = state.occurrences.find((item) => item.id === input.recordId)
    const requirement = state.requirements.find((item) => item.id === occurrence?.requirementId)
    if (!occurrence || !requirement || actor.role !== "manager" || requirement.organisationId !== actor.organisationId) throw new WorkspaceDomainError("You are not permitted to complete this session.", "FORBIDDEN")
    if (occurrence.version !== input.expectedVersion) throw new WorkspaceDomainError("This session changed. Refresh to continue.", "VERSION_CONFLICT", occurrence.version)
    if (occurrence.state !== "booked") throw new WorkspaceDomainError("Only a booked session can be completed.", "INVALID_TRANSITION", occurrence.version)
    next = { ...state, version: state.version + 1, occurrences: state.occurrences.map((item) => item.id === occurrence.id ? { ...item, state: "completed" as const, version: item.version + 1 } : item) }
    next = audit(next, actor.id, "mark-complete", occurrence.id, "Clinic confirmed session completion")
  } else if (input.command === "submit-invoice") {
    const booking = state.bookings.find((item) => item.id === input.recordId && item.doctorId === actor.id)
    if (!booking || actor.role !== "doctor") throw new WorkspaceDomainError("You are not permitted to invoice this booking.", "FORBIDDEN")
    if (booking.version !== input.expectedVersion) throw new WorkspaceDomainError("This booking changed. Refresh to continue.", "VERSION_CONFLICT", booking.version)
    if (!booking.occurrenceIds.every((id) => state.occurrences.find((item) => item.id === id)?.state === "completed")) throw new WorkspaceDomainError("Completed sessions must be confirmed before invoicing.", "INVALID_TRANSITION", booking.version)
    if (state.payments.some((item) => item.bookingId === booking.id)) throw new WorkspaceDomainError("An invoice has already been submitted for this booking.", "INVALID_TRANSITION", booking.version)
    const offer = state.offers.find((item) => item.id === booking.offerId)
    const payment = { id: `payment-${booking.id}`, bookingId: booking.id, state: "due" as const, amountMinor: offer?.totalMinor ?? 0, invoiceReference: String(input.payload?.invoiceReference || `DF-${booking.id}`), dueAt: String(input.payload?.dueAt || new Date(Date.now() + 30 * 86400000).toISOString()), version: 1 }
    next = { ...state, version: state.version + 1, payments: [...state.payments, payment] }
    next = audit(next, actor.id, "submit-invoice", payment.id, "Invoice submitted; payment remains unconfirmed")
    recordId = payment.id
  } else if (input.command === "confirm-payment") {
    const payment = state.payments.find((item) => item.id === input.recordId)
    const booking = state.bookings.find((item) => item.id === payment?.bookingId)
    const engagement = state.engagements.find((item) => item.id === booking?.engagementId)
    const requirement = state.requirements.find((item) => item.id === engagement?.requirementId)
    if (!payment || !requirement || actor.role !== "finance" || actor.organisationId !== requirement.organisationId) throw new WorkspaceDomainError("You are not permitted to confirm this payment.", "FORBIDDEN")
    if (payment.version !== input.expectedVersion) throw new WorkspaceDomainError("This payment changed. Refresh to continue.", "VERSION_CONFLICT", payment.version)
    if (payment.state !== "due" && payment.state !== "processing") throw new WorkspaceDomainError("This payment is not awaiting confirmation.", "INVALID_TRANSITION", payment.version)
    next = { ...state, version: state.version + 1, payments: state.payments.map((item) => item.id === payment.id ? { ...item, state: "paid" as const, version: item.version + 1 } : item) }
    next = audit(next, actor.id, "confirm-payment", payment.id, "Payment receipt confirmed")
  } else {
    const engagement = state.engagements.find((item) => item.id === input.recordId)
    const requirement = engagement && state.requirements.find((item) => item.id === engagement.requirementId)
    if (!engagement || !requirement || actor.role !== "manager" || actor.organisationId !== requirement.organisationId) throw new WorkspaceDomainError("You are not permitted to change this record.", "FORBIDDEN")
    if (engagement.version !== input.expectedVersion) throw new WorkspaceDomainError("This record has changed. Refresh to continue.", "VERSION_CONFLICT", engagement.version)
    if (input.command !== "shortlist" && input.command !== "start-discussion") throw new WorkspaceDomainError("This command is not enabled in Functional V1.", "COMMAND_NOT_ENABLED")
    if (input.command === "shortlist" && engagement.stage !== "applied" && engagement.stage !== "invited") throw new WorkspaceDomainError("Only a new application or invitation can be shortlisted.", "INVALID_TRANSITION", engagement.version)
    if (input.command === "start-discussion" && engagement.stage !== "shortlisted") throw new WorkspaceDomainError("Shortlist this candidate before starting a discussion.", "INVALID_TRANSITION", engagement.version)
    const stage: RecruitmentStage = input.command === "shortlist" ? "shortlisted" : "in_discussion"
    const updated: CandidateEngagement = { ...engagement, stage, version: engagement.version + 1 }
    next = { ...state, version: state.version + 1, engagements: state.engagements.map((item) => item.id === updated.id ? updated : item) }
    next = audit(next, actor.id, input.command, input.recordId, `${input.command} completed`)
  }

  next = { ...next, idempotency: { ...next.idempotency, [key]: { stateVersion: next.version, recordId, command: input.command } } }
  await saveWorkspaceState(next, state.version)
  return { state: next, replayed: false, recordId }
}

export async function sendWorkspaceMessage(actorId: string, conversationId: string, body: string, proposedRateMinor?: number) {
  const state = await getWorkspaceState()
  const conversation = state.conversations.find((item) => item.id === conversationId && item.participantIds.includes(actorId))
  if (!conversation) throw new WorkspaceDomainError("You are not permitted to use this conversation.", "FORBIDDEN")
  const actor = user(state, actorId)
  const sentAt = new Date().toISOString()
  const message = { id: `msg-${randomUUID()}`, conversationId, senderId: actorId, body, sentAt, proposedRateMinor, seenBy: { [actorId]: sentAt }, delivery: "sent" as const }
  const recipientIds = conversation.participantIds.filter((id) => id !== actorId)
  const next = { ...state, version: state.version + 1, engagements: state.engagements.map((item) => item.id === conversation.engagementId ? { ...item, lastContactAt: sentAt, nextAction: actor.role === "doctor" ? "Review doctor's reply" : "Awaiting doctor reply" } : item), messages: [...state.messages, message], notifications: [...state.notifications, ...recipientIds.map((recipientId) => ({ id: `notification-${randomUUID()}`, recipientId, category: "message" as const, title: `${actor.name} sent a message`, detail: body.slice(0, 90), href: `/engagements/${conversation.engagementId}`, sourceId: message.id, createdAt: sentAt }))] }
  await saveWorkspaceState(next, state.version)
  return message
}

export async function markConversationSeen(actorId: string, conversationId: string) {
  const state = await getWorkspaceState()
  const conversation = state.conversations.find((item) => item.id === conversationId && item.participantIds.includes(actorId))
  if (!conversation) throw new WorkspaceDomainError("You are not permitted to use this conversation.", "FORBIDDEN")
  const at = new Date().toISOString()
  const newlySeenIds = new Set(state.messages.filter((message) => message.conversationId === conversationId && message.senderId !== actorId && !message.seenBy[actorId]).map((message) => message.id))
  const engagementHref = `/engagements/${conversation.engagementId}`
  const next = { ...state, version: state.version + 1, messages: state.messages.map((message) => newlySeenIds.has(message.id) ? { ...message, seenBy: { ...message.seenBy, [actorId]: at } } : message), notifications: state.notifications.map((notification) => notification.recipientId === actorId && (newlySeenIds.has(notification.sourceId) || notification.href === engagementHref) && !notification.readAt ? { ...notification, readAt: at } : notification) }
  await saveWorkspaceState(next, state.version)
  return { seenAt: at }
}

export async function saveOnboardingDraft(actorId: string, audience: "doctor" | "clinic", expectedVersion: number, step: number, fields: Record<string, string>) {
  const state = await getWorkspaceState()
  const actor = user(state, actorId)
  if ((audience === "doctor" && actor.role !== "doctor") || (audience === "clinic" && actor.role !== "manager")) throw new WorkspaceDomainError("This onboarding workspace is not available for your role.", "FORBIDDEN")
  const existing = state.onboardingDrafts.find((item) => item.userId === actorId && item.audience === audience)
  if ((existing?.version ?? 0) !== expectedVersion) throw new WorkspaceDomainError("This draft changed. Refresh before saving again.", "VERSION_CONFLICT", existing?.version ?? 0)
  const draft = { id: existing?.id ?? `onboarding-${audience}-${actorId}`, userId: actorId, audience, step, status: existing?.status === "approved" ? "approved" as const : "draft" as const, fields, version: (existing?.version ?? 0) + 1, updatedAt: new Date().toISOString() }
  const next = { ...state, version: state.version + 1, onboardingDrafts: existing ? state.onboardingDrafts.map((item) => item.id === existing.id ? draft : item) : [...state.onboardingDrafts, draft] }
  await saveWorkspaceState(next, state.version)
  return draft
}
