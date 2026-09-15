"use client"

import {
  Bell,
  BriefcaseMedical,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Home,
  Inbox,
  MapPin,
  MessageSquareText,
  PoundSterling,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { conversationSeed, demoUsers, evidence, notificationSeed, sessions, type DemoRole, type DemoUser } from "@/lib/demo-data"
import { commandForTransition } from "@/lib/domain/commands"
import { MessagingWorkspace } from "@/components/MessagingWorkspace"
import { conversationHasUnread, formatGbp, markConversationSeen, type EngagementConversation } from "@/lib/messaging"

type FlowState = "invited" | "interested" | "offer_sent" | "offer_accepted" | "approved" | "ready" | "completed" | "invoice_submitted" | "paid"

const navigation: Record<DemoRole, Array<{ label: string; icon: typeof Home }>> = {
  doctor: [
    { label: "Home", icon: Home }, { label: "Find work", icon: Search }, { label: "Bookings", icon: CalendarDays }, { label: "Inbox", icon: Inbox }, { label: "Profile", icon: CircleUserRound },
  ],
  manager: [
    { label: "Home", icon: Home }, { label: "Find doctors", icon: Search }, { label: "Hiring", icon: BriefcaseMedical }, { label: "Inbox", icon: Inbox }, { label: "Account", icon: Building2 },
  ],
  approver: [
    { label: "Review queue", icon: ClipboardCheck }, { label: "Evidence", icon: FileCheck2 }, { label: "Approvals", icon: ShieldCheck }, { label: "Inbox", icon: Inbox }, { label: "Account", icon: CircleUserRound },
  ],
  finance: [
    { label: "Overview", icon: Home }, { label: "Completion", icon: ClipboardCheck }, { label: "Invoices", icon: PoundSterling }, { label: "Disputes", icon: MessageSquareText }, { label: "Account", icon: CircleUserRound },
  ],
  operations: [
    { label: "Queues", icon: Home }, { label: "People", icon: Users }, { label: "Organisations", icon: Building2 }, { label: "Cases", icon: ClipboardCheck }, { label: "Audit", icon: ShieldCheck },
  ],
}

const titles: Record<DemoRole, { eyebrow: string; title: string; lede: string }> = {
  doctor: { eyebrow: "Doctor workspace", title: "Today", lede: "Review your next action and upcoming work." },
  manager: { eyebrow: "Clinic workspace", title: "Staffing, clearly organised", lede: "One live requirement, one candidate record, and one accountable path from interest to a ready session." },
  approver: { eyebrow: "Clinical review", title: "Decisions with a clear scope", lede: "Review the evidence relevant to this doctor, site, service and period. Approval does not transfer elsewhere." },
  finance: { eyebrow: "Finance workspace", title: "Reconcile agreed work", lede: "Commercial terms, completion and payment records stay distinct, so the responsible payer always sees the real state." },
  operations: { eyebrow: "Operations workspace", title: "Trust needs an owner", lede: "Resolve verification and transaction exceptions through assigned cases with restricted access and a traceable decision." },
}

const flowOrder: FlowState[] = ["invited", "interested", "offer_sent", "offer_accepted", "approved", "ready", "completed", "invoice_submitted", "paid"]

function hasReached(current: FlowState, target: FlowState) {
  return flowOrder.indexOf(current) >= flowOrder.indexOf(target)
}

function Status({ tone = "neutral", children }: { tone?: "success" | "warning" | "info" | "neutral" | "error"; children: ReactNode }) {
  return <span className={`status ${tone}`}>{children}</span>
}

function SectionHeading({ title, action }: { title: string; action?: string }) {
  return <div className="section-heading"><h2>{title}</h2>{action && <button className="text-link" type="button">{action}</button>}</div>
}

function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "compact" : ""}`} role="img" aria-label="Doc+Find">
      <span className="brand-name" aria-hidden="true"><span className="brand-doc">Doc</span><span className="brand-plus">+</span><span className="brand-find">Find</span></span>
      {!compact && <small>Clinicians and clinics, clearly connected.</small>}
    </div>
  )
}

function OpportunityCard({ action, onAction, selectedCount = 2, disabled = false }: { action: string; onAction: () => void; selectedCount?: number; disabled?: boolean }) {
  return (
    <article className="card hero-card">
      <div className="opportunity">
        <div className="date-tile"><strong>06</strong><span>OCT</span></div>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 9 }}><Status tone="info">Strong date fit</Status><Status>{selectedCount} sessions selected</Status></div>
          <h3>Consultant Dermatologist · Outpatient clinic</h3>
          <p className="lede">Harley Street Skin Centre</p>
          <div className="meta-row">
            <span className="meta-item"><MapPin size={15} /> Marylebone, London</span>
            <span className="meta-item"><Clock3 size={15} /> 09:00–13:00</span>
            <span className="meta-item"><Stethoscope size={15} /> Adult general dermatology</span>
          </div>
        </div>
        <div className="rate">£600<small>per 4-hour session</small></div>
      </div>
      <div className="button-row">
        <button className="primary" type="button" onClick={onAction} disabled={disabled}>{action}{!disabled && <ChevronRight size={17} />}</button>
        <button className="secondary" type="button">View full requirement</button>
      </div>
      <p className="fictional">Fictional demonstration data. No live professional or organisation checks have taken place.</p>
    </article>
  )
}

function Timeline({ flow }: { flow: FlowState }) {
  const items = [
    ["Invitation sent", "Sarah Whitmore · 14 Sep, 10:04", "invited"],
    ["Doctor expressed interest", "Dr Anika Rao · 14 Sep, 10:26", "interested"],
    ["Offer version 2 accepted", "Authenticated prototype action", "offer_accepted"],
    ["Clinical scope approved", "Dr James Bell · Harley Street site", "approved"],
    ["Session ready for work", "All current start gates satisfied", "ready"],
    ["Work and payment reconciled", "Finance record confirmed", "paid"],
  ] as const
  return <div className="timeline">{items.filter(([, , state]) => hasReached(flow, state)).map(([label, detail]) => <div className="timeline-item" key={label}><span className="timeline-dot" /><div className="timeline-copy"><strong>{label}</strong><small>{detail}</small></div></div>)}</div>
}

function DoctorView({ tab, flow, setFlow }: { tab: string; flow: FlowState; setFlow: (flow: FlowState) => void }) {
  if (tab === "Find work") return <FindWork flow={flow} setFlow={setFlow} />
  if (tab === "Bookings") return <BookingWorkspace flow={flow} setFlow={setFlow} />
  if (tab === "Profile") return <ProfileView />

  const offerWaiting = flow === "offer_sent" || flow === "interested" || flow === "invited"
  return <>
    <div className="grid stats">
      <div className="card stat-card"><p className="stat-label">Profile completeness</p><div className="stat-value">92%</div><p className="stat-caption">One optional section remains</p></div>
      <div className="card stat-card"><p className="stat-label">Checked evidence</p><div className="stat-value">3</div><p className="stat-caption">One site task outstanding</p></div>
      <div className="card stat-card"><p className="stat-label">Applications</p><div className="stat-value">2</div><p className="stat-caption">One shortlisted</p></div>
      <div className="card stat-card"><p className="stat-label">Upcoming sessions</p><div className="stat-value">{hasReached(flow, "offer_accepted") ? 2 : 0}</div><p className="stat-caption">October · London</p></div>
    </div>
    <div className="grid two">
      <div className="grid">
        <SectionHeading title="Your next action" />
        {offerWaiting ? <OpportunityCard action={flow === "offer_sent" ? "Review offer" : flow === "invited" ? "Respond to invitation" : "Interest sent · awaiting clinic"} disabled={flow === "interested"} onAction={() => setFlow(flow === "offer_sent" ? "offer_accepted" : "interested")} /> : <BookingCard flow={flow} setFlow={setFlow} />}
      </div>
      <div className="grid">
        <section className="card"><SectionHeading title="Readiness" /><div className={hasReached(flow, "ready") ? "notice success" : "notice"}>{hasReached(flow, "ready") ? "Ready for work at the Harley Street site." : "Accepted terms do not yet mean permission to start. Site induction and clinical approval remain visible until completed."}</div><div className="evidence-list">{evidence.map((item, index) => <div className="evidence-row" key={item.label}><div className="evidence-copy"><strong>{item.label}</strong><span>{item.detail}</span></div><Status tone={hasReached(flow, "approved") && index === 3 ? "success" : item.tone}>{hasReached(flow, "approved") && index === 3 ? "Complete" : item.status}</Status></div>)}</div></section>
      </div>
    </div>
  </>
}

function FindWork({ flow, setFlow }: { flow: FlowState; setFlow: (flow: FlowState) => void }) {
  const [selected, setSelected] = useState(sessions.filter((item) => item.selected).map((item) => item.id))
  const applied = hasReached(flow, "interested")
  return <div className="grid two"><div className="grid"><section className="card"><SectionHeading title="Find suitable work" /><div className="field"><label htmlFor="search">Search opportunities</label><input id="search" defaultValue="Dermatology London" /></div><div className="button-row"><Status tone="info">Dermatology</Status><Status tone="info">London · 10 miles</Status><Status tone="info">£550+ / session</Status></div></section><OpportunityCard action={applied ? "Application submitted" : "Apply for selected dates"} disabled={applied} onAction={() => setFlow("interested")} selectedCount={selected.length} /></div><section className="card"><SectionHeading title="Choose occurrences" /><div className="session-grid">{sessions.map((session) => <button type="button" className={`session-choice ${selected.includes(session.id) ? "selected" : ""}`} key={session.id} onClick={() => setSelected((current) => current.includes(session.id) ? current.filter((id) => id !== session.id) : [...current, session.id])}><strong>{session.date}</strong><span>{session.time}</span></button>)}</div><p className="fictional">The clinic receives only the dates selected here, not the complete series.</p></section></div>
}

function BookingCard({ flow, setFlow }: { flow: FlowState; setFlow: (flow: FlowState) => void }) {
  const ready = hasReached(flow, "ready")
  const completed = hasReached(flow, "completed")
  return <article className="card hero-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}><div><Status tone={ready ? "success" : "warning"}>{ready ? "Ready for work" : "Confirmed · checks outstanding"}</Status><h2 style={{ marginTop: 14, marginBottom: 7 }}>October dermatology clinics</h2><p className="lede">Harley Street Skin Centre · two occurrences</p></div><div className="rate">£1,200<small>agreed total</small></div></div><div className="button-row">{!ready && <button className="secondary" type="button">View outstanding checks</button>}{ready && !completed && <button className="primary" type="button" onClick={() => setFlow("completed")}><Check size={17} />Mark session complete</button>}{completed && <Status tone="success">Completion recorded</Status>}</div></article>
}

function BookingWorkspace({ flow, setFlow }: { flow: FlowState; setFlow: (flow: FlowState) => void }) {
  return <div className="grid two"><div className="grid"><BookingCard flow={flow} setFlow={setFlow} /><section className="card"><SectionHeading title="Occurrences" />{sessions.slice(0, 2).map((item) => <div className="task-row" key={item.id}><div className="task-copy"><strong>{item.date}</strong><span>{item.time} · Europe/London</span></div><Status tone={hasReached(flow, "ready") ? "success" : "warning"}>{hasReached(flow, "ready") ? "Ready" : "Blocked"}</Status></div>)}</section></div><section className="card"><SectionHeading title="Engagement history" /><Timeline flow={flow} /></section></div>
}

function ProfileView() {
  return <div className="grid two"><section className="card"><SectionHeading title="Professional profile" /><div className="field-grid"><div className="field"><label htmlFor="specialty">Primary specialty</label><input id="specialty" defaultValue="Dermatology" /></div><div className="field"><label htmlFor="base">Professional base</label><input id="base" defaultValue="London" /></div><div className="field"><label htmlFor="rate">Preferred session rate</label><input id="rate" defaultValue="£600" /></div><div className="field"><label htmlFor="visibility">Directory visibility</label><select id="visibility" defaultValue="verified"><option value="verified">Verified organisations</option><option>Existing relationships only</option><option>Hidden</option></select></div></div><div className="progress-track"><div className="progress-fill" style={{ width: "92%" }} /></div><p className="field-hint">Profile completeness is separate from professional checks and engagement readiness.</p></section><section className="card"><SectionHeading title="Contact control" /><div className="notice info">Messages first. Your professional phone number is disclosed only after you approve a request from this organisation.</div><div className="task-row"><div className="task-copy"><strong>Professional number</strong><span>+44 •••• ••• 418</span></div><Status>Request required</Status></div></section></div>
}

function ManagerView({ tab, flow, setFlow }: { tab: string; flow: FlowState; setFlow: (flow: FlowState) => void }) {
  if (tab === "Find doctors") return <DoctorSearch flow={flow} setFlow={setFlow} />
  if (tab === "Hiring") return <HiringView flow={flow} setFlow={setFlow} />
  if (tab === "Account") return <OrganisationView />
  return <><div className="grid stats"><div className="card stat-card"><p className="stat-label">Open requirements</p><div className="stat-value">1</div><p className="stat-caption">3 occurrences</p></div><div className="card stat-card"><p className="stat-label">Live candidates</p><div className="stat-value">4</div><p className="stat-caption">Three new approaches</p></div><div className="card stat-card"><p className="stat-label">Approval tasks</p><div className="stat-value">{hasReached(flow, "approved") ? 0 : 1}</div><p className="stat-caption">Owned by Dr Bell</p></div><div className="card stat-card"><p className="stat-label">Fill rate</p><div className="stat-value">67%</div><p className="stat-caption">2 of 3 occurrences</p></div></div><div className="grid two"><HiringView flow={flow} setFlow={setFlow} compact /><section className="card"><SectionHeading title="Engagement activity" /><Timeline flow={flow} /></section></div></>
}

function DoctorSearch({ flow, setFlow }: { flow: FlowState; setFlow: (flow: FlowState) => void }) {
  const invitationStarted = hasReached(flow, "invited")
  return <div className="grid two"><section className="card"><SectionHeading title="Find doctors" /><div className="field"><label htmlFor="doctor-search">Search by specialty, scope or area</label><input id="doctor-search" defaultValue="Dermatology · available 6 October" /></div><div className="button-row"><Status tone="info">Adult dermatology</Status><Status tone="info">Within 10 miles</Status><Status tone="info">Date fit</Status></div></section><article className="card hero-card"><div style={{ display: "flex", gap: 14, alignItems: "center" }}><div className="avatar">AR</div><div><h3>Dr Anika Rao</h3><p className="lede">Consultant dermatologist · London</p></div></div><div className="meta-row"><span>Registration checked 14 Sep 2026</span><span>Available for 2 of 3 dates</span><span>£600 per session</span></div><div className="notice info" style={{ marginTop: 18 }}>Match explanation: specialty, location and self-declared availability align. This is not a judgement of clinical competence.</div><div className="button-row"><button className="primary" type="button" disabled={invitationStarted} onClick={() => setFlow("invited")}>{invitationStarted ? "Invitation in progress" : "Invite to requirement"}</button><button className="secondary" type="button">View profile</button></div></article></div>
}

function HiringView({ flow, setFlow, compact = false }: { flow: FlowState; setFlow: (flow: FlowState) => void; compact?: boolean }) {
  const action = flow === "interested" ? "Send structured offer" : flow === "offer_sent" ? "Offer awaiting response" : hasReached(flow, "offer_accepted") ? "Offer accepted" : "Review candidate"
  return <div className={compact ? "grid" : "grid two"}><section className="card hero-card"><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><Status tone="info">REQ-1042 · Open</Status><h2 style={{ marginTop: 14, marginBottom: 7 }}>Dermatology outpatient cover</h2><p className="lede">Harley Street · three Tuesday sessions · two positions tentatively filled</p></div><div className="rate">£600<small>per occurrence</small></div></div><div className="button-row"><button className="primary" type="button" onClick={() => flow === "interested" && setFlow("offer_sent")}>{action}</button><button className="secondary" type="button">Edit as new version</button></div></section>{!compact && <section className="card"><SectionHeading title="Candidate pipeline" /><div className="task-list"><div className="task-row"><div className="task-copy"><strong>Dr Anika Rao</strong><span>Application origin · two selected occurrences</span></div><Status tone={hasReached(flow, "offer_accepted") ? "success" : "warning"}>{hasReached(flow, "offer_accepted") ? "Accepted" : flow === "offer_sent" ? "Offer sent" : "Interested"}</Status></div><div className="task-row"><div className="task-copy"><strong>Dr Theo Martin</strong><span>Invitation origin · awaiting response</span></div><Status>Invitation sent</Status></div></div><p className="fictional">An invitation to an existing applicant reuses the same candidate record.</p></section>}</div>
}

function OrganisationView() {
  return <div className="grid two"><section className="card"><SectionHeading title="Organisation profile" /><div className="field-grid"><div className="field"><label htmlFor="org-name">Trading name</label><input id="org-name" defaultValue="Harley Street Skin Centre" /></div><div className="field"><label htmlFor="org-site">Approved site</label><input id="org-site" defaultValue="Marylebone, London" /></div><div className="field"><label htmlFor="service">Service</label><input id="service" defaultValue="Adult outpatient dermatology" /></div><div className="field"><label htmlFor="owner">Clinical approval owner</label><input id="owner" defaultValue="Dr James Bell" /></div></div></section><section className="card"><SectionHeading title="Responsibilities" /><div className="task-list"><div className="task-row"><div className="task-copy"><strong>Recruiting and offers</strong><span>Sarah Whitmore</span></div><Status tone="success">Assigned</Status></div><div className="task-row"><div className="task-copy"><strong>Clinical approval</strong><span>Dr James Bell · Harley Street site</span></div><Status tone="success">Assigned</Status></div><div className="task-row"><div className="task-copy"><strong>Payment reconciliation</strong><span>Maya Wilson</span></div><Status tone="success">Assigned</Status></div></div></section></div>
}

function ApproverView({ flow, setFlow }: { flow: FlowState; setFlow: (flow: FlowState) => void }) {
  const approved = hasReached(flow, "approved")
  const ready = hasReached(flow, "ready")
  return <div className="grid two"><section className="card"><SectionHeading title="Evidence for this decision" /><div className="notice info">Decision scope: Dr Anika Rao · Harley Street site · adult outpatient dermatology · through 31 Dec 2026.</div><div className="evidence-list">{evidence.slice(0, 3).map((item) => <div className="evidence-row" key={item.label}><div className="evidence-copy"><strong>{item.label}</strong><span>{item.detail}</span></div><Status tone="success">{item.status}</Status></div>)}</div><div className="button-row">{!approved ? <><button className="primary" type="button" onClick={() => setFlow("approved")}><ShieldCheck size={17} />Approve this scope</button><button className="secondary" type="button">Request information</button></> : !ready ? <><Status tone="success">Scope approved</Status><button className="primary" type="button" onClick={() => setFlow("ready")}><Check size={17} />Mark ready for work</button></> : <Status tone="success">Ready for work</Status>}</div></section><section className="card"><SectionHeading title="Decision record" /><div className="field"><label htmlFor="rationale">Clinical rationale</label><textarea id="rationale" defaultValue="Evidence supports the proposed adult general dermatology outpatient scope at this site." /></div><p className="fictional">Administrative ownership does not grant clinical approval permission. Approval is restricted to this site, scope and period.</p></section></div>
}

function FinanceView({ flow, setFlow }: { flow: FlowState; setFlow: (flow: FlowState) => void }) {
  const complete = hasReached(flow, "completed")
  const invoiced = hasReached(flow, "invoice_submitted")
  const paid = hasReached(flow, "paid")
  return <div className="grid two"><section className="card hero-card"><Status tone={paid ? "success" : invoiced ? "warning" : "neutral"}>{paid ? "Payment confirmed" : invoiced ? "Invoice submitted" : complete ? "Completion confirmed" : "Not yet due"}</Status><h2 style={{ marginTop: 14 }}>October dermatology clinics</h2><div className="rate" style={{ textAlign: "left" }}>£1,200<small>GBP · organisation pays doctor directly</small></div><div className="button-row">{complete && !invoiced && <button className="primary" type="button" onClick={() => setFlow("invoice_submitted")}>Record invoice submission</button>}{invoiced && !paid && <button className="primary" type="button" onClick={() => setFlow("paid")}>Confirm payment received</button>}{paid && <Status tone="success"><Check size={13} />Reconciled</Status>}</div></section><section className="card"><SectionHeading title="Payment record" /><div className="task-list"><div className="task-row"><div className="task-copy"><strong>Responsible payer</strong><span>Harley Street Skin Centre Ltd</span></div></div><div className="task-row"><div className="task-copy"><strong>Invoice reference</strong><span>{invoiced ? "AR-2026-1042" : "Not submitted"}</span></div></div><div className="task-row"><div className="task-copy"><strong>Due date</strong><span>{invoiced ? "30 Nov 2026" : "Calculated after submission"}</span></div></div></div><p className="fictional">Recording an invoice never changes the payment state to confirmed.</p></section></div>
}

function OperationsView({ flow, setFlow }: { flow: FlowState; setFlow: (flow: FlowState) => void }) {
  return <><div className="grid stats"><div className="card stat-card"><p className="stat-label">Assigned cases</p><div className="stat-value">4</div><p className="stat-caption">One action required</p></div><div className="card stat-card"><p className="stat-label">Evidence reviews</p><div className="stat-value">2</div><p className="stat-caption">Oldest: 42 minutes</p></div><div className="card stat-card"><p className="stat-label">Access alerts</p><div className="stat-value">1</div><p className="stat-caption">Blocked automatically</p></div><div className="card stat-card"><p className="stat-label">Appeals</p><div className="stat-value">0</div><p className="stat-caption">No open appeals</p></div></div><div className="grid two"><section className="card"><SectionHeading title="Review queues" /><div className="task-list"><div className="task-row"><div className="task-copy"><strong>Site induction review</strong><span>Dr Anika Rao · owner: Lena Ford</span></div><Status tone="warning">Action required</Status></div><div className="task-row"><div className="task-copy"><strong>Organisation authority</strong><span>Harley Street Skin Centre · reviewed</span></div><Status tone="success">Complete</Status></div><div className="task-row"><div className="task-copy"><strong>Private number access attempt</strong><span>Organisation mismatch · access denied</span></div><Status tone="error">Restricted</Status></div></div><div className="button-row"><button className="primary" type="button" onClick={() => setFlow(hasReached(flow, "approved") ? flow : "approved")}>Resolve induction case</button></div></section><section className="card"><SectionHeading title="Audit trail" /><Timeline flow={flow} /></section></div></>
}

export function PrototypeApp({ initialUser }: { initialUser: DemoUser }) {
  const [hydrated, setHydrated] = useState(false)
  const [user, setUser] = useState(initialUser)
  const [activeTab, setActiveTab] = useState(navigation[initialUser.role][0].label)
  const [flow, setFlow] = useState<FlowState>("offer_sent")
  const [version, setVersion] = useState(0)
  const [workflowError, setWorkflowError] = useState<string>()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [conversations, setConversations] = useState<EngagementConversation[]>(conversationSeed)
  const [selectedConversationId, setSelectedConversationId] = useState<string>()
  const tabs = navigation[user.role]
  const title = titles[user.role]
  const progress = useMemo(() => Math.round(((flowOrder.indexOf(flow) + 1) / flowOrder.length) * 100), [flow])
  const visibleConversations = useMemo(() => conversations.filter((conversation) => {
    if (user.role === "doctor") return conversation.doctorId === user.id
    if (user.role === "manager") return conversation.organisationId === user.organisationId
    return false
  }), [conversations, user])
  const unreadConversations = useMemo(
    () => visibleConversations.filter((conversation) => conversationHasUnread(conversation, user.id)),
    [user.id, visibleConversations],
  )

  useEffect(() => {
    let frame = 0
    void fetch("/api/v1/prototype/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: initialUser.id }) })
      .finally(() => { frame = window.requestAnimationFrame(() => setHydrated(true)) })
    return () => window.cancelAnimationFrame(frame)
  }, [initialUser.id])

  async function advanceFlow(next: FlowState) {
    const command = commandForTransition(flow, next)
    if (!command) return
    setWorkflowError(undefined)
    const response = await fetch("/api/v1/workflow/command", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID(), "expected-version": String(version) },
      body: JSON.stringify({ command, recordId: "eng-1", payload: {} }),
    })
    const result = await response.json() as { success: boolean; data?: { state: FlowState; version: number }; error?: { message: string; currentVersion?: number } }
    if (!response.ok || !result.data) {
      setWorkflowError(result.error?.message ?? "The workflow action could not be completed.")
      if (typeof result.error?.currentVersion === "number") setVersion(result.error.currentVersion)
      return
    }
    setFlow(result.data.state)
    setVersion(result.data.version)
  }

  async function switchUser(nextUser: DemoUser) {
    await fetch("/api/v1/prototype/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: nextUser.id }) })
    setUser(nextUser)
    setActiveTab(navigation[nextUser.role][0].label)
    setSelectedConversationId(undefined)
    setNotificationsOpen(false)
  }

  async function reset() {
    await fetch("/api/v1/prototype/reset", { method: "POST" })
    setFlow("offer_sent")
    setVersion(0)
    setWorkflowError(undefined)
    setConversations(conversationSeed)
    setSelectedConversationId(undefined)
    setNotificationsOpen(false)
    setActiveTab(navigation[user.role][0].label)
  }

  function renderWorkspace() {
    if (activeTab === "Inbox" && (user.role === "doctor" || user.role === "manager")) {
      return <MessagingWorkspace user={user} conversations={conversations} selectedConversationId={selectedConversationId} onSelectConversation={setSelectedConversationId} onConversationsChange={setConversations} />
    }
    if (user.role === "doctor") return <DoctorView tab={activeTab} flow={flow} setFlow={(next) => void advanceFlow(next)} />
    if (user.role === "manager") return <ManagerView tab={activeTab} flow={flow} setFlow={(next) => void advanceFlow(next)} />
    if (user.role === "approver") return <ApproverView flow={flow} setFlow={(next) => void advanceFlow(next)} />
    if (user.role === "finance") return <FinanceView flow={flow} setFlow={(next) => void advanceFlow(next)} />
    return <OperationsView flow={flow} setFlow={(next) => void advanceFlow(next)} />
  }

  function openConversation(conversationId: string) {
    setSelectedConversationId(conversationId)
    setActiveTab("Inbox")
    setNotificationsOpen(false)
  }

  function markAllConversationNotificationsRead() {
    const readAt = new Date().toISOString()
    setConversations((current) => current.map((conversation) =>
      visibleConversations.some((visible) => visible.id === conversation.id)
        ? markConversationSeen(conversation, user.id, readAt)
        : conversation,
    ))
  }

  return <div data-hydrated={hydrated ? "true" : "false"}>
    <div className="prototype-bar">
      <div className="prototype-label"><span className="prototype-pulse" /><strong>LOCAL PROTOTYPE</strong><span>Fictional data · no live checks</span></div>
      <div className="prototype-actions">
        <select className="prototype-button" aria-label="Switch prototype user" value={user.id} onChange={(event) => { const next = demoUsers.find((item) => item.id === event.target.value); if (next) void switchUser(next) }}>
          {demoUsers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.roleLabel}</option>)}
        </select>
        <button className="prototype-button" type="button" onClick={() => void reset()}><RefreshCw size={13} style={{ display: "inline", marginRight: 5 }} /><span>Reset</span></button>
      </div>
    </div>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandWordmark />
        </div>
        <nav className="nav-list" aria-label={`${user.roleLabel} navigation`}>{tabs.map(({ label, icon: Icon }) => <button type="button" key={label} className={`nav-button ${activeTab === label ? "active" : ""}`} onClick={() => setActiveTab(label)}><Icon size={19} />{label}</button>)}</nav>
        <div className="nav-spacer" />
        <div className="sidebar-note"><strong>{user.name}</strong><br />{user.roleLabel}{user.organisation && <><br />{user.organisation}</>}<div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>Demo journey {progress}% complete</div>
      </aside>
      <main className="main">
        <div className="mobile-brand"><BrandWordmark compact /></div>
        <header className="page-header"><div><p className="eyebrow">{title.eyebrow}</p><h1>{title.title}</h1><p className="lede">{title.lede}</p></div><div className="header-actions"><button type="button" className="icon-button" aria-label={`Open notifications${unreadConversations.length ? `, ${unreadConversations.length} unread` : ""}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}><Bell size={20} />{unreadConversations.length > 0 && <><span className="notification-dot" /><span className="notification-count">{unreadConversations.length}</span></>}</button><div className="avatar" aria-label={user.name}>{user.initials}</div></div></header>
        <div className="screen-tabs" role="tablist" aria-label="Workspace pages">{tabs.map(({ label }) => <button type="button" role="tab" aria-selected={activeTab === label} className={`screen-tab ${activeTab === label ? "active" : ""}`} key={label} onClick={() => setActiveTab(label)}>{label}</button>)}</div>
        {notificationsOpen && <aside className="notification-panel" aria-label="Notifications"><div className="notification-header"><div><p className="eyebrow">Activity</p><h2>Notifications</h2></div>{unreadConversations.length > 0 && <button className="text-link" type="button" onClick={markAllConversationNotificationsRead}>Mark all seen</button>}</div><div className="notification-summary"><strong>{unreadConversations.length} conversation{unreadConversations.length === 1 ? "" : "s"} need attention</strong><span>{user.role === "manager" ? "Review each doctor request individually." : "Open each clinic approach to send a seen receipt."}</span></div><div className="notification-scroll">{unreadConversations.map((conversation) => { const lastMessage = conversation.messages.at(-1); const proposedPrice = [...conversation.messages].reverse().find((message) => message.offer)?.offer; return <button type="button" className="notification-item notification-action" key={conversation.id} onClick={() => openConversation(conversation.id)}><span className="unread-mark" /><span className="notification-copy"><strong>{user.role === "manager" ? `${conversation.doctorName} approached your clinic` : `${conversation.organisationName} contacted you`}</strong><span>{conversation.requirementTitle}{proposedPrice ? ` · ${formatGbp(proposedPrice.amountMinor)}` : ""}</span><small>{lastMessage?.body}</small></span><ChevronRight size={17} /></button>})}{notificationSeed.map((item) => <div className="notification-item" key={item.id}>{item.unread ? <span className="unread-mark" /> : <span className="read-mark" />}<span className="notification-copy"><strong>{item.title}</strong><span>{item.detail} · {item.time}</span></span></div>)}</div></aside>}
        {workflowError && <div className="notice" role="alert">{workflowError}</div>}
        {renderWorkspace()}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">{tabs.map(({ label, icon: Icon }) => <button type="button" key={label} className={`nav-button ${activeTab === label ? "active" : ""}`} onClick={() => setActiveTab(label)}><Icon size={20} />{label}</button>)}</nav>
    </div>
  </div>
}
