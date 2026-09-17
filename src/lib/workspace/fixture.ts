import type { WorkspaceState } from "./types"

export function createWorkspaceFixture(): WorkspaceState {
  const NOW = new Date().toISOString()
  return {
    version: 1,
    users: [
      { id: "doctor-anika", name: "Dr Anika Rao", role: "doctor", roleLabel: "Consultant dermatologist", initials: "AR", siteIds: [], email: "doctor@docfind.demo", accountStatus: "active" },
      { id: "manager-sarah", name: "Sarah Whitmore", role: "manager", roleLabel: "Clinic manager", initials: "SW", organisationId: "org-harley", siteIds: ["site-harley", "site-chelsea"], email: "clinic@docfind.demo", accountStatus: "active" },
    ],
    credentials: [],
    organisations: [
      { id: "org-harley", name: "Harley Street Skin Centre", legalName: "Harley Street Skin Centre Ltd", status: "approved", version: 1 },
    ],
    sites: [
      { id: "site-harley", organisationId: "org-harley", name: "Harley Street", area: "Marylebone, London", scope: ["Adult outpatient dermatology"], version: 1 },
      { id: "site-chelsea", organisationId: "org-harley", name: "Chelsea Day Clinic", area: "Chelsea, London", scope: ["Minor skin surgery"], version: 1 },
    ],
    doctors: [
      { id: "doctor-anika", name: "Dr Anika Rao", initials: "AR", specialty: "Dermatology", scopes: ["Adult general dermatology", "Outpatient consultations"], baseArea: "London", travelRadiusMiles: 12, availabilityState: "confirmed", availableOccurrenceIds: ["occ-06", "occ-13"], availabilityConfirmedAt: NOW, expectedRateMinor: 60000, experience: "12 years · high-volume outpatient clinics", evidenceSummary: "Registration checked 14 September 2026", discoverable: true, contactPreference: "request_call", version: 2 },
    ],
    requirements: [
      { id: "req-harley-october", organisationId: "org-harley", siteId: "site-harley", title: "October dermatology cover", specialty: "Dermatology", scope: "Adult outpatient dermatology", workload: "Up to 14 patients per four-hour clinic", support: "Dermatology nurse and results administration", occurrenceIds: ["occ-06", "occ-13", "occ-20"], rateMinor: 60000, currency: "GBP", status: "published", ownerId: "manager-sarah", deadline: "2026-09-28T17:00:00.000Z", createdAt: "2026-09-10T09:00:00.000Z", urgent: false, version: 3 },
    ],
    occurrences: [
      { id: "occ-06", requirementId: "req-harley-october", siteId: "site-harley", startsAt: "2026-10-06T08:00:00.000Z", endsAt: "2026-10-06T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["clinical_approval"], version: 1 },
      { id: "occ-13", requirementId: "req-harley-october", siteId: "site-harley", startsAt: "2026-10-13T08:00:00.000Z", endsAt: "2026-10-13T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["clinical_approval"], version: 1 },
      { id: "occ-20", requirementId: "req-harley-october", siteId: "site-harley", startsAt: "2026-10-20T08:00:00.000Z", endsAt: "2026-10-20T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["clinical_approval"], version: 1 },
    ],
    engagements: [
      { id: "eng-anika-harley", doctorId: "doctor-anika", requirementId: "req-harley-october", origins: ["invitation"], stage: "offer_sent", selectedOccurrenceIds: ["occ-06", "occ-13"], ownerId: "manager-sarah", lastContactAt: NOW, nextAction: "Awaiting doctor's decision", version: 4 },
    ],
    offers: [
      { id: "offer-anika-v1", engagementId: "eng-anika-harley", version: 1, status: "superseded", occurrenceIds: ["occ-06"], scope: "Adult outpatient dermatology", rateMinor: 60000, totalMinor: 60000, currency: "GBP", payer: "Harley Street Skin Centre Ltd", paymentTerms: "Payment due within 30 days of invoice", cancellationTerms: "Seven days' notice by either party", conditions: ["Site induction", "Scoped clinical approval"], expiresAt: "2026-09-20T17:00:00.000Z", sentAt: "2026-09-14T09:00:00.000Z" },
      { id: "offer-anika-v2", engagementId: "eng-anika-harley", version: 2, status: "sent", occurrenceIds: ["occ-06", "occ-13"], scope: "Adult outpatient dermatology", rateMinor: 60000, totalMinor: 120000, currency: "GBP", payer: "Harley Street Skin Centre Ltd", paymentTerms: "Payment due within 30 days of invoice", cancellationTerms: "Seven days' notice by either party", conditions: ["Site induction", "Scoped clinical approval"], expiresAt: "2026-10-01T12:00:00.000Z", sentAt: NOW },
    ],
    evidence: [
      { id: "evidence-anika-identity", doctorId: "doctor-anika", category: "identity", status: "checked", validUntil: "2027-09-15T00:00:00.000Z", checkedAt: NOW, version: 1 },
      { id: "evidence-anika-registration", doctorId: "doctor-anika", category: "registration", status: "checked", validUntil: "2027-09-15T00:00:00.000Z", checkedAt: NOW, version: 1 },
      { id: "evidence-anika-indemnity", doctorId: "doctor-anika", category: "indemnity", status: "checked", validUntil: "2026-12-31T23:59:59.000Z", checkedAt: NOW, version: 1 },
    ],
    approvals: [],
    bookings: [],
    payments: [],
    conversations: [
      { id: "conversation-anika-harley", engagementId: "eng-anika-harley", participantIds: ["doctor-anika", "manager-sarah"], version: 1 },
    ],
    messages: [
      { id: "msg-anika-1", conversationId: "conversation-anika-harley", senderId: "manager-sarah", body: "Hello Dr Rao. We have two supported Tuesday clinics for you to review.", sentAt: NOW, proposedRateMinor: 60000, seenBy: {}, delivery: "sent" },
    ],
    notifications: [
      { id: "notification-offer-anika", recipientId: "doctor-anika", category: "action", title: "Offer ready to review", detail: "Harley Street Skin Centre · October dermatology cover", href: "/offers/offer-anika-v2", sourceId: "offer-anika-v2", createdAt: NOW },
    ],
    onboardingDrafts: [
      { id: "onboarding-doctor-anika", userId: "doctor-anika", audience: "doctor", step: 3, status: "review_pending", fields: { specialty: "Dermatology", baseArea: "London", rate: "600" }, version: 2, updatedAt: NOW },
      { id: "onboarding-clinic-harley", userId: "manager-sarah", audience: "clinic", step: 4, status: "approved", fields: { organisation: "Harley Street Skin Centre", site: "Harley Street", service: "Adult outpatient dermatology" }, version: 2, updatedAt: NOW },
    ],
    messageDrafts: {},
    auditEvents: [
      { id: "audit-offer-v2", actorId: "manager-sarah", action: "send-offer", recordId: "offer-anika-v2", version: 2, at: NOW, detail: "Offer version 2 sent for two October occurrences" },
    ],
    idempotency: {},
  }
}
