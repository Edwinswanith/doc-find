import type { WorkspaceState } from "./types"

const NOW = "2026-09-15T12:00:00.000Z"

export function createWorkspaceFixture(): WorkspaceState {
  return {
    version: 1,
    users: [
      { id: "doctor-anika", name: "Dr Anika Rao", role: "doctor", roleLabel: "Consultant dermatologist", initials: "AR", siteIds: [] },
      { id: "doctor-theo", name: "Dr Theo Martin", role: "doctor", roleLabel: "Consultant dermatologist", initials: "TM", siteIds: [] },
      { id: "doctor-priya", name: "Dr Priya Shah", role: "doctor", roleLabel: "Associate specialist", initials: "PS", siteIds: [] },
      { id: "doctor-daniel", name: "Dr Daniel Okoro", role: "doctor", roleLabel: "Consultant dermatologist", initials: "DO", siteIds: [] },
      { id: "doctor-sofia", name: "Dr Sofia Malik", role: "doctor", roleLabel: "Consultant dermatologist", initials: "SM", siteIds: [] },
      { id: "manager-sarah", name: "Sarah Whitmore", role: "manager", roleLabel: "Clinic manager", initials: "SW", organisationId: "org-harley", siteIds: ["site-harley", "site-chelsea"] },
      { id: "manager-emma", name: "Emma Lewis", role: "manager", roleLabel: "Clinic manager", initials: "EL", organisationId: "org-riverside", siteIds: ["site-riverside"] },
      { id: "approver-james", name: "Dr James Bell", role: "approver", roleLabel: "Clinical approver", initials: "JB", organisationId: "org-harley", siteIds: ["site-harley"] },
      { id: "finance-maya", name: "Maya Wilson", role: "finance", roleLabel: "Finance coordinator", initials: "MW", organisationId: "org-harley", siteIds: ["site-harley", "site-chelsea"] },
      { id: "operations-lena", name: "Lena Ford", role: "operations", roleLabel: "Platform operations", initials: "LF", siteIds: [] },
    ],
    organisations: [
      { id: "org-harley", name: "Harley Street Skin Centre", legalName: "Harley Street Skin Centre Ltd", status: "approved", version: 1 },
      { id: "org-riverside", name: "Riverside Dermatology", legalName: "Riverside Dermatology Clinics Ltd", status: "approved", version: 1 },
    ],
    sites: [
      { id: "site-harley", organisationId: "org-harley", name: "Harley Street", area: "Marylebone, London", scope: ["Adult outpatient dermatology"], version: 1 },
      { id: "site-chelsea", organisationId: "org-harley", name: "Chelsea Day Clinic", area: "Chelsea, London", scope: ["Minor skin surgery"], version: 1 },
      { id: "site-riverside", organisationId: "org-riverside", name: "Riverside Clinic", area: "Richmond, London", scope: ["Rapid-access dermatology"], version: 1 },
    ],
    doctors: [
      { id: "doctor-anika", name: "Dr Anika Rao", initials: "AR", specialty: "Dermatology", scopes: ["Adult general dermatology", "Outpatient consultations"], baseArea: "London", travelRadiusMiles: 12, availabilityState: "confirmed", availableOccurrenceIds: ["occ-06", "occ-13"], availabilityConfirmedAt: NOW, expectedRateMinor: 60000, experience: "12 years · high-volume outpatient clinics", evidenceSummary: "Registration checked 14 September 2026", discoverable: true, contactPreference: "request_call", version: 2 },
      { id: "doctor-theo", name: "Dr Theo Martin", initials: "TM", specialty: "Dermatology", scopes: ["Adult general dermatology", "Dermatoscopy"], baseArea: "London", travelRadiusMiles: 20, availabilityState: "confirmed", availableOccurrenceIds: ["occ-06", "occ-13", "occ-20"], availabilityConfirmedAt: NOW, expectedRateMinor: 62500, experience: "9 years · independent sector clinics", evidenceSummary: "Registration checked 12 September 2026", discoverable: true, contactPreference: "messages_first", version: 1 },
      { id: "doctor-priya", name: "Dr Priya Shah", initials: "PS", specialty: "Dermatology", scopes: ["Adult general dermatology", "Acne services"], baseArea: "Hertfordshire", travelRadiusMiles: 30, availabilityState: "partial", availableOccurrenceIds: ["occ-06"], availabilityConfirmedAt: "2026-09-10T09:00:00.000Z", expectedRateMinor: 57500, experience: "7 years · NHS and private outpatient work", evidenceSummary: "Indemnity review due", discoverable: true, contactPreference: "messages_first", version: 1 },
      { id: "doctor-daniel", name: "Dr Daniel Okoro", initials: "DO", specialty: "Dermatology", scopes: ["Adult general dermatology", "Minor skin surgery"], baseArea: "London", travelRadiusMiles: 15, availabilityState: "unknown", availableOccurrenceIds: [], expectedRateMinor: 65000, experience: "11 years · practising privileges at two London hospitals", evidenceSummary: "Availability needs confirmation", discoverable: true, contactPreference: "professional_phone", version: 1 },
      { id: "doctor-sofia", name: "Dr Sofia Malik", initials: "SM", specialty: "Dermatology", scopes: ["Adult general dermatology", "Outpatient consultations"], baseArea: "London", travelRadiusMiles: 10, availabilityState: "confirmed", availableOccurrenceIds: ["occ-02"], availabilityConfirmedAt: "2026-08-25T09:00:00.000Z", expectedRateMinor: 59000, experience: "10 years · private outpatient and community dermatology", evidenceSummary: "All baseline evidence checked", discoverable: true, contactPreference: "messages_first", version: 1 },
    ],
    requirements: [
      { id: "req-harley-october", organisationId: "org-harley", siteId: "site-harley", title: "October dermatology cover", specialty: "Dermatology", scope: "Adult outpatient dermatology", workload: "Up to 14 patients per four-hour clinic", support: "Dermatology nurse and results administration", occurrenceIds: ["occ-06", "occ-13", "occ-20"], rateMinor: 60000, currency: "GBP", status: "published", ownerId: "manager-sarah", deadline: "2026-09-28T17:00:00.000Z", version: 3 },
      { id: "req-chelsea-surgery", organisationId: "org-harley", siteId: "site-chelsea", title: "Minor skin surgery list", specialty: "Dermatology", scope: "Minor skin surgery", workload: "Eight procedures with nurse support", support: "Procedure room, nurse and consumables", occurrenceIds: ["occ-27"], rateMinor: 70000, currency: "GBP", status: "draft", ownerId: "manager-sarah", deadline: "2026-10-10T17:00:00.000Z", version: 1 },
      { id: "req-riverside-saturday", organisationId: "org-riverside", siteId: "site-riverside", title: "Saturday rapid-access clinic", specialty: "Dermatology", scope: "Rapid-access dermatology", workload: "Ten new-patient consultations", support: "Healthcare assistant and prescribing support", occurrenceIds: ["occ-riv-10"], rateMinor: 65000, currency: "GBP", status: "published", ownerId: "manager-emma", deadline: "2026-09-30T17:00:00.000Z", version: 2 },
      { id: "req-harley-september", organisationId: "org-harley", siteId: "site-harley", title: "September follow-up clinic", specialty: "Dermatology", scope: "Adult outpatient dermatology", workload: "Twelve follow-up consultations", support: "Dermatology nurse and administration support", occurrenceIds: ["occ-02"], rateMinor: 59000, currency: "GBP", status: "closed", ownerId: "manager-sarah", deadline: "2026-08-28T17:00:00.000Z", version: 4 },
    ],
    occurrences: [
      { id: "occ-06", requirementId: "req-harley-october", siteId: "site-harley", startsAt: "2026-10-06T08:00:00.000Z", endsAt: "2026-10-06T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["site_induction", "clinical_approval"], version: 1 },
      { id: "occ-13", requirementId: "req-harley-october", siteId: "site-harley", startsAt: "2026-10-13T08:00:00.000Z", endsAt: "2026-10-13T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["site_induction", "clinical_approval"], version: 1 },
      { id: "occ-20", requirementId: "req-harley-october", siteId: "site-harley", startsAt: "2026-10-20T08:00:00.000Z", endsAt: "2026-10-20T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["site_induction", "clinical_approval"], version: 1 },
      { id: "occ-27", requirementId: "req-chelsea-surgery", siteId: "site-chelsea", startsAt: "2026-10-27T09:00:00.000Z", endsAt: "2026-10-27T13:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["clinical_approval"], version: 1 },
      { id: "occ-riv-10", requirementId: "req-riverside-saturday", siteId: "site-riverside", startsAt: "2026-10-10T08:00:00.000Z", endsAt: "2026-10-10T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 0, state: "requested", requiredChecks: ["site_induction", "clinical_approval"], version: 1 },
      { id: "occ-02", requirementId: "req-harley-september", siteId: "site-harley", startsAt: "2026-09-02T08:00:00.000Z", endsAt: "2026-09-02T12:00:00.000Z", timezone: "Europe/London", capacity: 1, reserved: 1, state: "completed", requiredChecks: ["clinical_approval"], version: 3 },
    ],
    engagements: [
      { id: "eng-anika-harley", doctorId: "doctor-anika", requirementId: "req-harley-october", origins: ["invitation"], stage: "offer_sent", selectedOccurrenceIds: ["occ-06", "occ-13"], ownerId: "manager-sarah", lastContactAt: NOW, nextAction: "Awaiting doctor's decision", version: 4 },
      { id: "eng-theo-harley", doctorId: "doctor-theo", requirementId: "req-harley-october", origins: ["application"], stage: "applied", selectedOccurrenceIds: ["occ-06", "occ-13", "occ-20"], ownerId: "manager-sarah", lastContactAt: "2026-09-15T10:12:00.000Z", nextAction: "Review application", version: 2 },
      { id: "eng-priya-harley", doctorId: "doctor-priya", requirementId: "req-harley-october", origins: ["application"], stage: "shortlisted", selectedOccurrenceIds: ["occ-06"], ownerId: "manager-sarah", lastContactAt: "2026-09-15T11:06:00.000Z", nextAction: "Start discussion", version: 2 },
      { id: "eng-daniel-harley", doctorId: "doctor-daniel", requirementId: "req-harley-october", origins: ["application"], stage: "applied", selectedOccurrenceIds: ["occ-20"], ownerId: "manager-sarah", lastContactAt: "2026-09-15T11:42:00.000Z", nextAction: "Confirm availability", version: 1 },
      { id: "eng-anika-riverside", doctorId: "doctor-anika", requirementId: "req-riverside-saturday", origins: ["invitation"], stage: "invited", selectedOccurrenceIds: ["occ-riv-10"], ownerId: "manager-emma", lastContactAt: "2026-09-15T12:20:00.000Z", nextAction: "Doctor to respond", version: 1 },
      { id: "eng-sofia-harley", doctorId: "doctor-sofia", requirementId: "req-harley-september", origins: ["application", "invitation"], stage: "terms_accepted", selectedOccurrenceIds: ["occ-02"], ownerId: "manager-sarah", lastContactAt: "2026-09-05T15:30:00.000Z", nextAction: "Relationship available for repeat work", version: 7 },
    ],
    offers: [
      { id: "offer-anika-v1", engagementId: "eng-anika-harley", version: 1, status: "superseded", occurrenceIds: ["occ-06"], scope: "Adult outpatient dermatology", rateMinor: 60000, totalMinor: 60000, currency: "GBP", payer: "Harley Street Skin Centre Ltd", paymentTerms: "Payment due within 30 days of invoice", cancellationTerms: "Seven days' notice by either party", conditions: ["Site induction", "Scoped clinical approval"], expiresAt: "2026-09-20T17:00:00.000Z", sentAt: "2026-09-14T09:00:00.000Z" },
      { id: "offer-anika-v2", engagementId: "eng-anika-harley", version: 2, status: "sent", occurrenceIds: ["occ-06", "occ-13"], scope: "Adult outpatient dermatology", rateMinor: 60000, totalMinor: 120000, currency: "GBP", payer: "Harley Street Skin Centre Ltd", paymentTerms: "Payment due within 30 days of invoice", cancellationTerms: "Seven days' notice by either party", conditions: ["Site induction", "Scoped clinical approval"], expiresAt: "2026-10-01T12:00:00.000Z", sentAt: NOW },
      { id: "offer-sofia-v1", engagementId: "eng-sofia-harley", version: 1, status: "accepted", occurrenceIds: ["occ-02"], scope: "Adult outpatient dermatology", rateMinor: 59000, totalMinor: 59000, currency: "GBP", payer: "Harley Street Skin Centre Ltd", paymentTerms: "Payment due within 30 days of invoice", cancellationTerms: "Seven days' notice by either party", conditions: ["Scoped clinical approval"], expiresAt: "2026-08-31T17:00:00.000Z", sentAt: "2026-08-26T09:00:00.000Z", acceptedAt: "2026-08-26T12:30:00.000Z" },
    ],
    evidence: [
      { id: "evidence-anika-identity", doctorId: "doctor-anika", category: "identity", status: "checked", validUntil: "2027-09-15T00:00:00.000Z", checkedAt: NOW, version: 1 },
      { id: "evidence-anika-registration", doctorId: "doctor-anika", category: "registration", status: "checked", validUntil: "2027-09-15T00:00:00.000Z", checkedAt: NOW, version: 1 },
      { id: "evidence-anika-indemnity", doctorId: "doctor-anika", category: "indemnity", status: "checked", validUntil: "2026-12-31T23:59:59.000Z", checkedAt: NOW, version: 1 },
      { id: "evidence-sofia-identity", doctorId: "doctor-sofia", category: "identity", status: "checked", validUntil: "2027-09-01T00:00:00.000Z", checkedAt: "2026-08-24T12:00:00.000Z", version: 1 },
      { id: "evidence-sofia-registration", doctorId: "doctor-sofia", category: "registration", status: "checked", validUntil: "2027-09-01T00:00:00.000Z", checkedAt: "2026-08-24T12:00:00.000Z", version: 1 },
      { id: "evidence-sofia-indemnity", doctorId: "doctor-sofia", category: "indemnity", status: "checked", validUntil: "2027-03-31T00:00:00.000Z", checkedAt: "2026-08-24T12:00:00.000Z", version: 1 },
    ],
    approvals: [
      { id: "approval-anika-harley", doctorId: "doctor-anika", siteId: "site-harley", scope: "Adult outpatient dermatology", status: "requested", validUntil: "2026-12-31T23:59:59.000Z", ownerId: "approver-james", version: 1 },
      { id: "approval-sofia-harley", doctorId: "doctor-sofia", siteId: "site-harley", scope: "Adult outpatient dermatology", status: "approved", validUntil: "2027-03-31T23:59:59.000Z", ownerId: "approver-james", rationale: "Evidence and site scope reviewed", version: 2 },
    ],
    bookings: [
      { id: "booking-sofia-september", engagementId: "eng-sofia-harley", offerId: "offer-sofia-v1", doctorId: "doctor-sofia", occurrenceIds: ["occ-02"], agreementState: "terms_accepted", createdAt: "2026-08-26T12:30:00.000Z", version: 2 },
    ],
    payments: [
      { id: "payment-sofia-september", bookingId: "booking-sofia-september", state: "paid", amountMinor: 59000, invoiceReference: "DF-SM-0902", dueAt: "2026-10-02T17:00:00.000Z", version: 2 },
    ],
    conversations: [
      { id: "conversation-anika-harley", engagementId: "eng-anika-harley", participantIds: ["doctor-anika", "manager-sarah"], version: 1 },
      { id: "conversation-theo-harley", engagementId: "eng-theo-harley", participantIds: ["doctor-theo", "manager-sarah"], version: 1 },
      { id: "conversation-priya-harley", engagementId: "eng-priya-harley", participantIds: ["doctor-priya", "manager-sarah"], version: 1 },
      { id: "conversation-daniel-harley", engagementId: "eng-daniel-harley", participantIds: ["doctor-daniel", "manager-sarah"], version: 1 },
      { id: "conversation-anika-riverside", engagementId: "eng-anika-riverside", participantIds: ["doctor-anika", "manager-emma"], version: 1 },
      { id: "conversation-sofia-harley", engagementId: "eng-sofia-harley", participantIds: ["doctor-sofia", "manager-sarah"], version: 2 },
    ],
    messages: [
      { id: "msg-anika-1", conversationId: "conversation-anika-harley", senderId: "manager-sarah", body: "Hello Dr Rao. We have two supported Tuesday clinics for you to review.", sentAt: NOW, proposedRateMinor: 60000, seenBy: {}, delivery: "sent" },
      { id: "msg-theo-1", conversationId: "conversation-theo-harley", senderId: "doctor-theo", body: "I am available for all three October dates and regularly run high-volume general dermatology clinics.", sentAt: "2026-09-15T10:12:00.000Z", seenBy: {}, delivery: "sent" },
      { id: "msg-priya-1", conversationId: "conversation-priya-harley", senderId: "doctor-priya", body: "I would like to be considered for 6 October and can share recent clinic references.", sentAt: "2026-09-15T11:06:00.000Z", seenBy: {}, delivery: "sent" },
      { id: "msg-daniel-1", conversationId: "conversation-daniel-harley", senderId: "doctor-daniel", body: "I can cover 20 October. My availability for other dates needs confirmation.", sentAt: "2026-09-15T11:42:00.000Z", seenBy: {}, delivery: "sent" },
      { id: "msg-anika-riverside-1", conversationId: "conversation-anika-riverside", senderId: "manager-emma", body: "Would you consider our Saturday rapid-access clinic?", sentAt: "2026-09-15T12:20:00.000Z", proposedRateMinor: 65000, seenBy: {}, delivery: "sent" },
      { id: "msg-sofia-1", conversationId: "conversation-sofia-harley", senderId: "doctor-sofia", body: "Thank you. The session went smoothly and I have submitted invoice DF-SM-0902.", sentAt: "2026-09-03T10:00:00.000Z", seenBy: { "manager-sarah": "2026-09-03T10:18:00.000Z" }, delivery: "sent" },
      { id: "msg-sofia-2", conversationId: "conversation-sofia-harley", senderId: "manager-sarah", body: "Payment has now been confirmed. We would be happy to discuss repeat dates.", sentAt: "2026-09-05T15:30:00.000Z", seenBy: { "doctor-sofia": "2026-09-05T16:04:00.000Z" }, delivery: "sent" },
    ],
    notifications: [
      { id: "notification-offer-anika", recipientId: "doctor-anika", category: "action", title: "Offer ready to review", detail: "Harley Street · version 2", href: "/offers/offer-anika-v2", sourceId: "offer-anika-v2", createdAt: NOW },
      { id: "notification-theo-message", recipientId: "manager-sarah", category: "message", title: "Dr Theo Martin sent a message", detail: "October dermatology cover", href: "/engagements/eng-theo-harley", sourceId: "msg-theo-1", createdAt: "2026-09-15T10:12:00.000Z" },
      { id: "notification-priya-message", recipientId: "manager-sarah", category: "message", title: "Dr Priya Shah applied", detail: "Available 6 October", href: "/engagements/eng-priya-harley", sourceId: "msg-priya-1", createdAt: "2026-09-15T11:06:00.000Z" },
      { id: "notification-daniel-message", recipientId: "manager-sarah", category: "message", title: "Dr Daniel Okoro applied", detail: "Availability needs confirmation", href: "/engagements/eng-daniel-harley", sourceId: "msg-daniel-1", createdAt: "2026-09-15T11:42:00.000Z" },
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
