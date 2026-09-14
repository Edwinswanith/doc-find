import type { EngagementConversation } from "@/lib/messaging"

export type DemoRole = "doctor" | "manager" | "approver" | "finance" | "operations"

export type DemoUser = {
  id: string
  name: string
  role: DemoRole
  roleLabel: string
  initials: string
  organisation?: string
  organisationId?: string
}

export const demoUsers: DemoUser[] = [
  { id: "doctor-anika", name: "Dr Anika Rao", role: "doctor", roleLabel: "Consultant dermatologist", initials: "AR" },
  { id: "doctor-theo", name: "Dr Theo Martin", role: "doctor", roleLabel: "Consultant dermatologist", initials: "TM" },
  { id: "doctor-priya", name: "Dr Priya Shah", role: "doctor", roleLabel: "Associate specialist", initials: "PS" },
  { id: "doctor-daniel", name: "Dr Daniel Okoro", role: "doctor", roleLabel: "Consultant dermatologist", initials: "DO" },
  { id: "manager-sarah", name: "Sarah Whitmore", role: "manager", roleLabel: "Clinic manager", initials: "SW", organisation: "Harley Street Skin Centre", organisationId: "org-harley" },
  { id: "manager-emma", name: "Emma Lewis", role: "manager", roleLabel: "Clinic manager", initials: "EL", organisation: "Riverside Dermatology", organisationId: "org-riverside" },
  { id: "approver-james", name: "Dr James Bell", role: "approver", roleLabel: "Clinical approver", initials: "JB", organisation: "Harley Street Skin Centre", organisationId: "org-harley" },
  { id: "finance-maya", name: "Maya Wilson", role: "finance", roleLabel: "Finance coordinator", initials: "MW", organisation: "Harley Street Skin Centre", organisationId: "org-harley" },
  { id: "operations-lena", name: "Lena Ford", role: "operations", roleLabel: "Platform operations", initials: "LF", organisation: "Doc+Find operations" },
]

export const conversationSeed: EngagementConversation[] = [
  {
    id: "conversation-anika-harley",
    engagementId: "eng-anika-harley",
    doctorId: "doctor-anika",
    doctorName: "Dr Anika Rao",
    organisationId: "org-harley",
    organisationName: "Harley Street Skin Centre",
    requirementTitle: "October outpatient clinics",
    origin: "clinic",
    messages: [
      {
        id: "message-anika-harley-1",
        senderId: "manager-sarah",
        senderName: "Sarah Whitmore",
        body: "Hello Dr Rao. Your outpatient dermatology experience looks relevant to our October clinics. Would you consider two Tuesday sessions?",
        sentAt: "2026-09-14T09:18:00.000Z",
        offer: { currency: "GBP", amountMinor: 60000, status: "proposed" },
      },
    ],
  },
  {
    id: "conversation-theo-harley",
    engagementId: "eng-theo-harley",
    doctorId: "doctor-theo",
    doctorName: "Dr Theo Martin",
    organisationId: "org-harley",
    organisationName: "Harley Street Skin Centre",
    requirementTitle: "Tuesday dermatology cover",
    origin: "doctor",
    messages: [
      {
        id: "message-theo-harley-1",
        senderId: "doctor-theo",
        senderName: "Dr Theo Martin",
        body: "I am available for all three October dates and regularly run high-volume general dermatology clinics.",
        sentAt: "2026-09-14T10:12:00.000Z",
      },
    ],
  },
  {
    id: "conversation-priya-harley",
    engagementId: "eng-priya-harley",
    doctorId: "doctor-priya",
    doctorName: "Dr Priya Shah",
    organisationId: "org-harley",
    organisationName: "Harley Street Skin Centre",
    requirementTitle: "October outpatient clinics",
    origin: "doctor",
    messages: [
      {
        id: "message-priya-harley-1",
        senderId: "doctor-priya",
        senderName: "Dr Priya Shah",
        body: "I would like to be considered for 6 and 13 October. I can share recent clinic references if useful.",
        sentAt: "2026-09-14T11:06:00.000Z",
      },
    ],
  },
  {
    id: "conversation-daniel-harley",
    engagementId: "eng-daniel-harley",
    doctorId: "doctor-daniel",
    doctorName: "Dr Daniel Okoro",
    organisationId: "org-harley",
    organisationName: "Harley Street Skin Centre",
    requirementTitle: "October outpatient clinics",
    origin: "doctor",
    messages: [
      {
        id: "message-daniel-harley-1",
        senderId: "doctor-daniel",
        senderName: "Dr Daniel Okoro",
        body: "I can cover 20 October and have current practising privileges at two London independent hospitals.",
        sentAt: "2026-09-14T11:42:00.000Z",
      },
    ],
  },
  {
    id: "conversation-anika-riverside",
    engagementId: "eng-anika-riverside",
    doctorId: "doctor-anika",
    doctorName: "Dr Anika Rao",
    organisationId: "org-riverside",
    organisationName: "Riverside Dermatology",
    requirementTitle: "Saturday rapid-access clinic",
    origin: "clinic",
    messages: [
      {
        id: "message-anika-riverside-1",
        senderId: "manager-emma",
        senderName: "Emma Lewis",
        body: "We are opening a Saturday rapid-access clinic and would value your experience. Would you be open to a short conversation?",
        sentAt: "2026-09-14T12:20:00.000Z",
        offer: { currency: "GBP", amountMinor: 65000, status: "proposed" },
      },
    ],
  },
]

export const sessions = [
  { id: "s1", day: "06", month: "OCT", date: "Tue 6 Oct 2026", time: "09:00–13:00", selected: true },
  { id: "s2", day: "13", month: "OCT", date: "Tue 13 Oct 2026", time: "09:00–13:00", selected: true },
  { id: "s3", day: "20", month: "OCT", date: "Tue 20 Oct 2026", time: "09:00–13:00", selected: false },
]

export const evidence = [
  { label: "Professional identity", detail: "Passport and account ownership", status: "Checked", tone: "success" },
  { label: "GMC registration", detail: "Reference 7459012 · checked 14 Sep 2026", status: "Checked", tone: "success" },
  { label: "Professional indemnity", detail: "Valid until 31 Dec 2026", status: "Checked", tone: "success" },
  { label: "Site induction", detail: "Harley Street Skin Centre", status: "Action required", tone: "warning" },
] as const

export const notificationSeed = [
  { id: "n1", title: "Offer ready to review", detail: "Harley Street Skin Centre · version 2", time: "8 min", unread: false },
  { id: "n2", title: "Evidence checked", detail: "Professional indemnity was checked by operations", time: "Yesterday", unread: false },
  { id: "n3", title: "Opening updated", detail: "Two October dates remain available", time: "Yesterday", unread: false },
]
