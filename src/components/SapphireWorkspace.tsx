"use client"

import Link from "next/link"
import * as Dialog from "@radix-ui/react-dialog"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, Bell, BriefcaseBusiness, Building2, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, CircleHelp, ClipboardCheck, Command, Home, Inbox, LogOut, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, Search, Send, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Stethoscope, UserPlus, Users, X } from "lucide-react"
import type { CandidateEngagement, DoctorProfile, ReadinessResult, Requirement, SessionOccurrence, Site, WorkspaceState, WorkspaceUser } from "@/lib/workspace/types"
import { calculateOccurrenceReadiness, type CalendarItemStatus, classifyOccurrenceStaffing, requirementCoverage } from "@/lib/workspace/domain"
import { OnboardingWizard } from "./OnboardingWizard"

type Props = { initialActorId: string; initialState: WorkspaceState; view: string; recordId?: string }
type NavItem = { href: string; label: string; icon: typeof Home; section: "Plan" | "Work" | "Account" }

// Dialogs portal into the phone-frame shell (not document.body) so overlays and menus stay inside the mobile-app frame instead of covering the whole browser window.
const ShellContainerContext = createContext<HTMLDivElement | null>(null)
function usePortalContainer() { return useContext(ShellContainerContext) ?? undefined }

const money = (minor: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(minor / 100)
const date = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(iso))
const stage = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
function Urgency({ deadline }: { deadline: string }) {
  const days = daysUntil(deadline)
  if (days < 0) return null
  if (days <= 2) return <Status tone="danger">{days === 0 ? "Closes today" : `Urgent · ${days} day${days === 1 ? "" : "s"} left`}</Status>
  if (days <= 7) return <Status tone="warning">{`Closing soon · ${days} days left`}</Status>
  return null
}

const dayKey = (iso: string) => new Date(iso).toDateString()
const timeRange = (occurrence: { startsAt: string; endsAt: string }) => {
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" }).format(new Date(iso))
  return `${fmt(occurrence.startsAt)}–${fmt(occurrence.endsAt)}`
}
const shortDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" }).format(new Date(iso))
// A booking existing (an accepted offer) and a doctor's readiness (evidence + approvals) are
// deliberately independent facts elsewhere in this app -- this is the one place they're combined
// into a single glance-able status, so it must only ever be called where a booking is already known
// to exist. It never says just "Confirmed" alone: that would silently claim readiness is fine too.
function confirmationStatus(readiness: ReadinessResult): { tone: "success" | "warning"; label: string } {
  return readiness.state === "ready" ? { tone: "success", label: "Confirmed & ready" } : { tone: "warning", label: "Confirmed · readiness pending" }
}
function monthGrid(monthStart: Date) {
  const firstWeekday = (monthStart.getDay() + 6) % 7
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
  const cells: Date[] = []
  for (let i = firstWeekday; i > 0; i--) { const day = new Date(monthStart); day.setDate(day.getDate() - i); cells.push(day) }
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day))
  while (cells.length % 7 !== 0) { const next = new Date(cells[cells.length - 1]); next.setDate(next.getDate() + 1); cells.push(next) }
  return cells
}

function defaultRoute(user: WorkspaceUser) {
  if (user.role === "pending") return "/onboarding/role"
  if (user.accountStatus === "onboarding") {
    if (user.role === "doctor") return "/onboarding/doctor"
    if (user.role === "manager") return "/onboarding/clinic"
  }
  if (user.role === "manager") return `/clinic/${user.organisationId}/today`
  if (user.role === "doctor") return "/doctor/today"
  if (user.role === "approver") return "/approver/reviews"
  if (user.role === "finance") return "/finance/reconciliation"
  return "/operations/cases"
}

function navigation(user: WorkspaceUser): NavItem[] {
  // A manager mid-onboarding has no organisationId yet, so every clinic-scoped link below would
  // point at "/clinic/undefined/..." -- show only the wizard link until setup actually creates one.
  if (user.role === "manager" && !user.organisationId) return [{ href: "/onboarding/clinic", label: "Finish setup", icon: Building2, section: "Account" }]
  if (user.role === "manager") return [
    { href: `/clinic/${user.organisationId}/today`, label: "Today", icon: Home, section: "Plan" },
    { href: `/clinic/${user.organisationId}/hiring/vacancies`, label: "Vacancies", icon: BriefcaseBusiness, section: "Work" },
    { href: `/clinic/${user.organisationId}/hiring/candidates`, label: "Candidates", icon: Users, section: "Work" },
    { href: `/clinic/${user.organisationId}/hiring/offers`, label: "Offers", icon: CircleDollarSign, section: "Work" },
    { href: `/clinic/${user.organisationId}/doctors`, label: "Doctors", icon: Search, section: "Work" },
    { href: `/clinic/${user.organisationId}/bookings`, label: "Bookings", icon: CalendarDays, section: "Plan" },
    { href: `/clinic/${user.organisationId}/inbox`, label: "Inbox", icon: Inbox, section: "Work" },
  ]
  if (user.role === "doctor") return [
    { href: "/doctor/today", label: "Today", icon: Home, section: "Plan" },
    { href: "/doctor/schedule", label: "Schedule", icon: CalendarDays, section: "Plan" },
    { href: "/doctor/find-work", label: "Find work", icon: Search, section: "Work" },
    { href: "/doctor/bookings", label: "Bookings", icon: CalendarDays, section: "Work" },
    { href: "/doctor/earnings", label: "Earnings", icon: CircleDollarSign, section: "Work" },
    { href: "/doctor/inbox", label: "Inbox", icon: Inbox, section: "Work" },
    { href: "/onboarding/doctor", label: "Profile", icon: Stethoscope, section: "Account" },
  ]
  return [{ href: defaultRoute(user), label: user.role === "approver" ? "My reviews" : user.role === "finance" ? "Reconciliation" : "Cases", icon: user.role === "approver" ? ClipboardCheck : user.role === "finance" ? CircleDollarSign : ShieldCheck, section: "Work" }]
}

function activeNavigation(view: string, item: NavItem) { return view.includes(item.label.toLowerCase().replace(" ", "-")) || (item.label === "Today" && view.includes("today")) || (item.label === "Offers" && view === "offer") }

function WorkspaceLinks({ items, view, query = "", onNavigate }: { items: NavItem[]; view: string; query?: string; onNavigate?: () => void }) {
  const visible = items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
  const sections = [...new Set(visible.map((item) => item.section))]
  return <>{sections.map((section) => <div className="df-nav-section" key={section}><span className="df-nav-label">{section}</span><nav aria-label={`${section} navigation`}>{visible.filter((item) => item.section === section).map((item) => <Link title={item.label} aria-label={item.label} aria-current={activeNavigation(view, item) ? "page" : undefined} className={activeNavigation(view, item) ? "active" : ""} href={item.href} key={item.href} onClick={onNavigate}><item.icon size={19} /><span>{item.label}</span><i aria-hidden="true" /></Link>)}</nav></div>)}</>
}

function Status({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "info" | "danger" | "violet" | "slate" }) {
  return <span className={`df-status ${tone}`}>{children}</span>
}

function Empty({ title, detail }: { title: string; detail: string }) { return <div className="df-empty"><Search size={22} /><strong>{title}</strong><span>{detail}</span></div> }

// The six staffing states are told apart by an icon and a label, not only by colour, so the
// calendar stays legible for colour-blind managers and screen reader users alike.
const CALENDAR_STATUS_META: Record<CalendarItemStatus, { label: string; tone: "warning" | "info" | "violet" | "success" | "danger" | "slate"; Icon: typeof Check }> = {
  open: { label: "Open requirement", tone: "warning", Icon: UserPlus },
  applications: { label: "Applications received", tone: "info", Icon: Inbox },
  invited: { label: "Invite pending", tone: "violet", Icon: Send },
  confirmed: { label: "Confirmed", tone: "success", Icon: Check },
  action_required: { label: "Action required", tone: "danger", Icon: AlertTriangle },
  completed: { label: "Completed", tone: "slate", Icon: CheckCheck },
}
function CalendarStatusBadge({ status }: { status: CalendarItemStatus }) {
  const meta = CALENDAR_STATUS_META[status]
  return <Status tone={meta.tone}><meta.Icon size={13} /> {meta.label}</Status>
}

export function SapphireWorkspace({ initialActorId, initialState, view, recordId }: Props) {
  const [state, setState] = useState(initialState)
  const actorId = initialActorId
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [navigationCollapsed, setNavigationCollapsed] = useState(false)
  const [navigationQuery, setNavigationQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState("")
  const [shellNode, setShellNode] = useState<HTMLDivElement | null>(null)
  const router = useRouter()
  const actor = state.users.find((item) => item.id === actorId) ?? state.users[0]
  const organisation = state.organisations.find((item) => item.id === actor.organisationId)
  const unreadNotificationCount = state.notifications.filter((item) => item.recipientId === actor.id && !item.readAt).length
  const navigationItems = navigation(actor)
  const mobileItems = actor.role === "manager" && actor.organisationId ? navigationItems.filter((item) => ["Today", "Candidates", "Doctors", "Bookings", "Inbox"].includes(item.label)) : actor.role === "doctor" ? navigationItems.filter((item) => ["Today", "Find work", "Bookings", "Inbox", "Profile"].includes(item.label)) : navigationItems.slice(0, 5)

  useEffect(() => {
    function shortcut(event: KeyboardEvent) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true) } }
    window.addEventListener("keydown", shortcut)
    return () => window.removeEventListener("keydown", shortcut)
  }, [])

  const refresh = useCallback(async function refresh() {
    const response = await fetch("/api/v1/workspace/state", { cache: "no-store" })
    const result = await response.json()
    if (result.success) setState(result.data)
  }, [])

  // Each route (/doctor/..., /offers/..., /engagements/...) is its own page that renders a fresh
  // SapphireWorkspace with state fetched server-side -- there is no shared layout keeping this
  // component instance alive across navigation. So marking a notification read must be awaited and
  // completed *before* navigating to its target page; a fire-and-forget request racing the
  // navigation can lose, leaving the next page's server-rendered state (and therefore the unread
  // badge) stale even though the write eventually succeeds.
  const openNotification = useCallback(async function openNotification(notificationId: string, href: string) {
    await fetch(`/api/v1/notifications/${notificationId}/read`, { method: "POST" })
    router.push(href)
  }, [router])

  async function command(commandName: string, targetId: string, expectedVersion: number, payload?: Record<string, unknown>) {
    setBusy(true); setError("")
    const response = await fetch("/api/v1/workflow/command", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID(), "Expected-Version": String(expectedVersion) }, body: JSON.stringify({ command: commandName, recordId: targetId, payload }) })
    const result = await response.json()
    if (!result.success) setError(result.error.message)
    else await refresh()
    setBusy(false)
    return result
  }

  async function resetDemo() {
    if (!window.confirm("Reset all fictional Doc+Find demonstration data?")) return
    setError("")
    const response = await fetch("/api/v1/prototype/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation: "RESET DOC+FIND DEMO" }) })
    if (!response.ok) { const result = await response.json().catch(() => null); setError(result?.error?.message || "The demo could not be reset. Please try again."); return }
    await refresh()
    router.push(defaultRoute(actor))
  }

  async function logout() {
    await fetch("/api/v1/prototype/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return <ShellContainerContext.Provider value={shellNode}><div ref={setShellNode} className={`df-shell ${navigationCollapsed ? "is-navigation-collapsed" : ""}`} data-ui="sapphire-workspace">
    <aside className="df-sidebar">
      <Link href={defaultRoute(actor)} className="df-brand" aria-label="Doc+Find home"><span>Doc</span><b>+</b><span>Find</span></Link>
      <button className="df-collapse-navigation" type="button" aria-label={navigationCollapsed ? "Expand navigation" : "Collapse navigation"} onClick={() => setNavigationCollapsed((current) => !current)}>{navigationCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
      <div className="df-context"><span className="df-workspace-icon">{organisation?.name.slice(0, 1) ?? "D"}</span><div><small>Clinical workspace</small><strong>{organisation?.name ?? actor.roleLabel}</strong><span>All permitted sites</span></div><ChevronDown size={15} /></div>
      <div className="df-nav-search"><Search size={16} /><input name="workspace-nav-filter" value={navigationQuery} onChange={(event) => setNavigationQuery(event.target.value)} aria-label="Filter workspace navigation" placeholder="Find a view" /></div>
      <div className="df-sidebar-scroll"><WorkspaceLinks items={navigationItems} view={view} query={navigationQuery} /></div>
      <details className="df-demo-tools"><summary><Sparkles size={15} /><span>Demo tools</span></summary><div><span>Prototype only</span><button type="button" onClick={resetDemo}><Settings2 size={16} /> Reset demo data</button></div></details>
    </aside>
    <div className="df-main">
      <header className="df-topbar"><button className="df-mobile-menu-trigger" type="button" aria-label="Open workspace menu" onClick={() => setMobileMenuOpen(true)}><Menu size={22} /></button><Link href={defaultRoute(actor)} className="df-mobile-brand">Doc<span>+</span>Find</Link><button className="df-global-search" type="button" onClick={() => setCommandOpen(true)}><Search size={18} /><span>Search views and records</span><kbd>⌘ K</kbd></button><div className="df-top-actions"><span className="df-demo-badge"><Sparkles size={14} /> Demo data</span><button type="button" aria-label="Help and support"><CircleHelp size={19} /></button><Link href={actor.role === "doctor" ? "/doctor/inbox" : actor.role === "manager" && actor.organisationId ? `/clinic/${actor.organisationId}/inbox` : defaultRoute(actor)} aria-label={unreadNotificationCount > 0 ? `Notifications, ${unreadNotificationCount} unread` : "Notifications"}><Bell size={19} />{unreadNotificationCount > 0 && <i>{unreadNotificationCount}</i>}</Link><span className="df-avatar">{actor.initials}</span></div></header>
      {error && <div className="df-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
      <main className="df-content">
        {view === "clinic-today" && <ClinicToday state={state} actor={actor} busy={busy} command={command} />}
        {view === "clinic-vacancies" && <Vacancies state={state} actor={actor} busy={busy} command={command} />}
        {view === "clinic-candidates" && <Candidates state={state} actor={actor} busy={busy} command={command} />}
        {view === "clinic-offers" && <Offers state={state} actor={actor} />}
        {view === "clinic-doctors" && <Doctors state={state} actor={actor} busy={busy} command={command} />}
        {view === "doctor-today" && <DoctorToday state={state} actor={actor} onOpenNotification={openNotification} />}
        {view === "doctor-schedule" && <DoctorSchedule state={state} actor={actor} />}
        {view === "doctor-find-work" && <FindWork state={state} actor={actor} busy={busy} command={command} />}
        {view === "doctor-bookings" && <Bookings state={state} actor={actor} busy={busy} command={command} />}
        {view === "doctor-earnings" && <DoctorEarnings state={state} actor={actor} />}
        {view === "clinic-bookings" && <ClinicBookings state={state} actor={actor} busy={busy} command={command} />}
        {view === "clinic-inbox" && <InboxView state={state} actor={actor} onOpenNotification={openNotification} />}
        {view === "inbox" && <InboxView state={state} actor={actor} onOpenNotification={openNotification} />}
        {view === "engagement" && recordId && <EngagementView state={state} actor={actor} engagementId={recordId} onRefresh={refresh} />}
        {view === "offer" && recordId && <OfferView state={state} actor={actor} offerId={recordId} busy={busy} command={command} />}
        {view === "approver" && <ApproverView state={state} busy={busy} command={command} />}
        {view === "finance" && <FinanceView state={state} busy={busy} command={command} />}
        {view === "operations" && <OperationsView state={state} />}
        {view === "onboarding" && <OnboardingWizard state={state} actor={actor} audience={recordId === "clinic" ? "clinic" : "doctor"} onRefresh={refresh} />}
      </main>
    </div>
    <nav className="df-mobile-nav" aria-label="Mobile navigation">{mobileItems.map((item) => <Link className={activeNavigation(view, item) ? "active" : ""} aria-current={activeNavigation(view, item) ? "page" : undefined} aria-label={item.label} href={item.href} key={item.href}><item.icon size={20} /><span>{item.label}</span></Link>)}</nav>
    <WorkspaceMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} actor={actor} onLogout={logout} organisation={organisation?.name} items={navigationItems} view={view} query={navigationQuery} setQuery={setNavigationQuery} />
    <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} query={commandQuery} setQuery={setCommandQuery} state={state} actor={actor} items={navigationItems} view={view} />
  </div></ShellContainerContext.Provider>
}

function WorkspaceMenu({ open, onOpenChange, actor, onLogout, organisation, items, view, query, setQuery }: { open: boolean; onOpenChange: (value: boolean) => void; actor: WorkspaceUser; onLogout: () => Promise<void>; organisation?: string; items: NavItem[]; view: string; query: string; setQuery: (value: string) => void }) {
  const portalContainer = usePortalContainer()
  const [loggingOut, setLoggingOut] = useState(false)
  async function handleLogout() {
    setLoggingOut(true)
    await onLogout()
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal container={portalContainer}><Dialog.Overlay className="df-dialog-overlay" /><Dialog.Content className="df-mobile-menu"><Dialog.Title className="df-menu-title">Doc<b>+</b>Find</Dialog.Title><Dialog.Description className="df-menu-description">Navigate {organisation ?? actor.roleLabel}</Dialog.Description><Dialog.Close className="df-dialog-close" aria-label="Close workspace menu"><X size={20} /></Dialog.Close><div className="df-mobile-context"><span className="df-workspace-icon">{organisation?.slice(0, 1) ?? actor.initials.slice(0, 1)}</span><div><strong>{organisation ?? actor.name}</strong><span>{actor.roleLabel}</span></div></div><div className="df-nav-search mobile"><Search size={17} /><input name="workspace-nav-filter-mobile" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Filter workspace navigation" placeholder="Find a page" /></div><div className="df-mobile-menu-links"><WorkspaceLinks items={items} view={view} query={query} onNavigate={() => onOpenChange(false)} /></div><button type="button" className="df-mobile-logout" disabled={loggingOut} onClick={() => void handleLogout()}><LogOut size={17} />{loggingOut ? "Logging out…" : "Log out"}</button></Dialog.Content></Dialog.Portal></Dialog.Root>
}

function CommandPalette({ open, onOpenChange, query, setQuery, state, actor, items, view }: { open: boolean; onOpenChange: (value: boolean) => void; query: string; setQuery: (value: string) => void; state: WorkspaceState; actor: WorkspaceUser; items: NavItem[]; view: string }) {
  const portalContainer = usePortalContainer()
  const term = query.trim().toLowerCase()
  const records = actor.role === "manager" ? state.engagements.filter((eng) => { const doctor = state.doctors.find((item) => item.id === eng.doctorId); const req = state.requirements.find((item) => item.id === eng.requirementId); return !term || `${doctor?.name} ${req?.title}`.toLowerCase().includes(term) }).slice(0, 5) : []
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal container={portalContainer}><Dialog.Overlay className="df-dialog-overlay" /><Dialog.Content className="df-command-palette"><Dialog.Title><Command size={19} /> Search Doc+Find</Dialog.Title><Dialog.Description>Open an authorised view or candidate record.</Dialog.Description><Dialog.Close className="df-dialog-close" aria-label="Close search"><X size={20} /></Dialog.Close><label className="df-command-input"><Search size={19} /><input autoFocus name="command-palette-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search views, doctors or vacancies" /></label><div className="df-command-results"><span>Views</span><WorkspaceLinks items={items} view={view} query={query} onNavigate={() => onOpenChange(false)} />{actor.role === "manager" && <><span>Candidate records</span>{records.map((eng) => { const doctor = state.doctors.find((item) => item.id === eng.doctorId); const req = state.requirements.find((item) => item.id === eng.requirementId); return <Link key={eng.id} href={`/clinic/${actor.organisationId}/hiring/candidates?candidateId=${eng.id}&stage=all`} onClick={() => onOpenChange(false)}><span className="df-avatar small">{doctor?.initials}</span><div><strong>{doctor?.name}</strong><small>{req?.title}</small></div><ChevronRight size={17} /></Link> })}</>}</div></Dialog.Content></Dialog.Portal></Dialog.Root>
}

function PageTitle({ eyebrow, title, detail, actions }: { eyebrow: string; title: string; detail: string; actions?: React.ReactNode }) {
  const Icon = /doctor|onboarding|opportunit|schedule/i.test(eyebrow) ? Stethoscope : /message|communication/i.test(eyebrow) ? MessageSquare : /finance|earnings/i.test(eyebrow) ? CircleDollarSign : /governance|operations/i.test(eyebrow) ? ShieldCheck : BriefcaseBusiness
  return <div className="df-page-title"><div className="df-title-cluster"><span className="df-page-icon" aria-hidden="true"><Icon size={20} /></span><div><span className="df-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{detail}</p></div></div>{actions}</div>
}

function HiringNav({ actor, active }: { actor: WorkspaceUser; active: "vacancies" | "candidates" | "offers" }) {
  const root = `/clinic/${actor.organisationId}/hiring`
  return <nav className="df-view-nav" aria-label="Hiring views"><Link className={active === "vacancies" ? "active" : ""} href={`${root}/vacancies`}>Vacancies</Link><Link className={active === "candidates" ? "active" : ""} href={`${root}/candidates`}>Candidates</Link><Link className={active === "offers" ? "active" : ""} href={`${root}/offers`}>Offers</Link></nav>
}

function GroupHeader({ tone, title, count }: { tone: "blue" | "purple" | "green"; title: string; count: number }) {
  return <div className={`df-group-header ${tone}`}><span aria-hidden="true" /><strong>{title}</strong><small>{count}</small></div>
}

function EngagementLifecycle({ state, actor, engagement }: { state: WorkspaceState; actor: WorkspaceUser; engagement: CandidateEngagement }) {
  const offers = state.offers.filter((item) => item.engagementId === engagement.id)
  const booking = state.bookings.find((item) => item.engagementId === engagement.id)
  const payment = state.payments.find((item) => item.bookingId === booking?.id)
  const occurrenceStates = booking?.occurrenceIds.map((id) => state.occurrences.find((item) => item.id === id)?.state) ?? []
  const readiness = booking?.occurrenceIds.map((id) => calculateOccurrenceReadiness(state, engagement.doctorId, id)) ?? []
  const rank: Record<CandidateEngagement["stage"], number> = { invited: 0, applied: 0, shortlisted: 1, in_discussion: 1, offer_sent: 2, terms_accepted: 3, declined: 2, withdrawn: 1 }
  const reached = rank[engagement.stage]
  const applied = engagement.origins.includes("application")
  const isDoctor = actor.role === "doctor"
  const latestOffer = offers.toSorted((a, b) => b.version - a.version)[0]

  // Every step links to the real page that covers it, so clicking one takes you straight to
  // where that action actually happens instead of leaving you to guess. Steps with nothing to
  // show yet (no offer sent, or a payments view this actor can't open) stay unclickable.
  const conversationHref = `/engagements/${engagement.id}`
  const offerHref = latestOffer ? `/offers/${latestOffer.id}` : undefined
  const scheduleHref = isDoctor ? "/doctor/schedule" : actor.organisationId ? `/clinic/${actor.organisationId}/bookings` : undefined
  const paidHref = isDoctor ? "/doctor/earnings" : undefined

  // "Ready" can be blocked by different things (missing evidence vs. a clinic approval that's out
  // of the doctor's hands), so the hint has to name the actual blocker rather than a generic
  // checklist -- otherwise it tells a doctor to do something they've already done.
  const readinessStates = new Set(readiness.map((item) => item.state))
  const readinessNeedsEvidence = readinessStates.has("evidence_needed")
  const readinessNeedsApproval = readinessStates.has("approval_required") || readinessStates.has("blocked")
  const readyHref = isDoctor && readinessNeedsEvidence ? "/onboarding/doctor" : scheduleHref
  const readyHint = !isDoctor
    ? "This is waiting on the doctor's evidence and your clinical approver — nothing to action here."
    : readinessNeedsEvidence
      ? "Submit your outstanding evidence (identity, registration or indemnity) from your profile."
      : readinessNeedsApproval
        ? "This is with your clinic now — clinical approval and site induction are outstanding. There's nothing more for you to do."
        : "Complete your outstanding checks so you're ready to work."

  const nextStepText: Record<string, string> = {
    Invited: isDoctor ? "Reply to start the conversation with the clinic." : "Wait for the doctor to respond to your invitation.",
    Applied: isDoctor ? "Wait for the clinic to get in touch." : "Start a conversation with this candidate.",
    Conversation: isDoctor ? "Reply in the conversation to discuss the role." : "Message the candidate to agree details before sending an offer.",
    Offer: isDoctor ? "Wait for the clinic to send you a formal offer." : "Send a formal offer with your terms.",
    Accepted: isDoctor ? "Review the offer, then accept or decline it." : "Wait for the doctor to accept the offer.",
    Ready: readyHint,
    Complete: "This is marked complete automatically once the session has taken place.",
    Paid: "Payment is released once the work is confirmed complete.",
  }

  const steps = [
    { label: applied ? "Applied" : "Invited", description: applied ? "Your application has been submitted" : "You were invited to apply", done: true, href: conversationHref },
    { label: "Conversation", description: "Initial discussion completed", done: reached >= 1 || state.messages.some((item) => state.conversations.find((conversation) => conversation.id === item.conversationId)?.engagementId === engagement.id), href: conversationHref },
    { label: "Offer", description: "Offer received and under review", done: offers.length > 0, href: offerHref },
    { label: "Accepted", description: "You've accepted the offer", done: engagement.stage === "terms_accepted" || Boolean(booking), href: offerHref },
    { label: "Ready", description: "All checks completed", done: readiness.length > 0 && readiness.every((item) => item.state === "ready"), href: readyHref },
    { label: "Complete", description: "Work completed and confirmed", done: occurrenceStates.length > 0 && occurrenceStates.every((item) => item === "completed"), href: scheduleHref },
    { label: "Paid", description: "Payment processed", done: payment?.state === "paid", href: paidHref },
  ]
  const firstPending = steps.findIndex((item) => !item.done)
  const currentIndex = firstPending === -1 ? steps.length - 1 : firstPending
  const currentStep = steps[currentIndex]
  const hint = currentStep.done ? "This engagement is complete — there's nothing left to do." : nextStepText[currentStep.label]
  // "Ready" blocked on clinic approval has nowhere for the doctor to act, so no "Go now" button --
  // showing one next to "there's nothing more for you to do" would contradict the hint itself.
  const noActionAvailable = currentStep.label === "Ready" && isDoctor && !readinessNeedsEvidence && readinessNeedsApproval
  const pathname = usePathname()
  const ctaHref = !currentStep.done && !noActionAvailable && currentStep.href && currentStep.href !== pathname ? currentStep.href : undefined
  const listRef = useRef<HTMLOListElement>(null)
  const currentRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const list = listRef.current; const current = currentRef.current
    if (!list || !current) return
    const target = current.offsetLeft + current.offsetWidth / 2 - list.clientWidth / 2
    list.scrollTo({ left: Math.max(0, target), behavior: "smooth" })
  }, [currentIndex])
  return <div className="df-lifecycle-wrap">
    <ol className="df-lifecycle" aria-label="Engagement lifecycle" ref={listRef}>{steps.map((item, index) => {
      const next = steps[index + 1]; const line = next ? (item.done && next.done ? "line-solid" : item.done ? "line-gradient" : "line-dashed") : ""
      const isCurrent = index === currentIndex; const stateClass = item.done ? "complete" : isCurrent ? "current" : ""
      const body = <><span>{item.done ? <Check size={16} /> : index + 1}</span><strong>{item.label}</strong><p>{item.description}</p></>
      return <li ref={isCurrent ? currentRef : undefined} className={[stateClass, line].filter(Boolean).join(" ")} aria-current={isCurrent ? "step" : undefined} key={item.label}>
        {item.href ? <Link className="df-lifecycle-step" href={item.href} aria-label={`Go to ${item.label}: ${item.description}`}>{body}</Link> : body}
      </li>
    })}</ol>
    <p className="df-lifecycle-hint"><span>Next</span>{hint}{ctaHref && <Link className="df-lifecycle-cta" href={ctaHref}>Go now <ChevronRight size={14} /></Link>}</p>
  </div>
}

type ClinicCalendarEntry = { occurrence: SessionOccurrence; requirement: Requirement; site?: Site; staffing: ReturnType<typeof classifyOccurrenceStaffing> }

const CALENDAR_DOT_ORDER: CalendarItemStatus[] = ["action_required", "applications", "invited", "open", "confirmed", "completed"]
function calendarDotClass(status: CalendarItemStatus) { return status === "action_required" ? "action" : status }

function ClinicToday({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) {
  const [monthStart, setMonthStart] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState(() => new Date().toDateString())
  const [openOccurrenceId, setOpenOccurrenceId] = useState<string | undefined>(undefined)

  const now = new Date()
  const notifications = state.notifications.filter((item) => item.recipientId === actor.id).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)); const unread = notifications.filter((item) => !item.readAt)
  const welcomeNotification = unread.find((item) => item.category === "update")
  const candidateUnread = unread.filter((item) => item.category !== "update")
  const requirementIds = new Set(state.requirements.filter((item) => item.organisationId === actor.organisationId).map((item) => item.id))
  const entries: ClinicCalendarEntry[] = state.occurrences
    .filter((item) => requirementIds.has(item.requirementId) && item.state !== "cancelled")
    .map((occurrence): ClinicCalendarEntry | undefined => {
      const requirement = state.requirements.find((item) => item.id === occurrence.requirementId)
      return requirement ? { occurrence, requirement, site: state.sites.find((item) => item.id === occurrence.siteId), staffing: classifyOccurrenceStaffing(state, occurrence.id) } : undefined
    })
    .filter((item): item is ClinicCalendarEntry => Boolean(item))

  const entriesByDay = new Map<string, ClinicCalendarEntry[]>()
  for (const entry of entries) { const key = dayKey(entry.occurrence.startsAt); entriesByDay.set(key, [...(entriesByDay.get(key) ?? []), entry]) }

  function shiftMonth(delta: number) {
    const next = new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1)
    setMonthStart(next)
    const today = new Date()
    setSelectedDay(next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth() ? today.toDateString() : next.toDateString())
  }

  const cells = monthGrid(monthStart)
  const todayKey = new Date().toDateString()
  const selectedEntries = (entriesByDay.get(selectedDay) ?? []).toSorted((a, b) => a.occurrence.startsAt.localeCompare(b.occurrence.startsAt))

  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
  const withinWeek = entries.filter((item) => { const startsAt = new Date(item.occurrence.startsAt); return startsAt >= now && startsAt <= weekEnd })

  const confirmedUpcoming = state.bookings
    .flatMap((booking) => booking.occurrenceIds.map((occurrenceId) => ({ booking, occurrenceId })))
    .map(({ booking, occurrenceId }) => {
      const occurrence = state.occurrences.find((item) => item.id === occurrenceId)
      if (!occurrence || occurrence.state === "cancelled" || occurrence.state === "completed" || new Date(occurrence.startsAt) < now) return undefined
      const requirement = state.requirements.find((item) => item.id === occurrence.requirementId)
      if (!requirement || requirement.organisationId !== actor.organisationId) return undefined
      const site = state.sites.find((item) => item.id === occurrence.siteId)
      const doctor = state.doctors.find((item) => item.id === booking.doctorId)
      return { booking, occurrence, requirement, site, doctor, readiness: calculateOccurrenceReadiness(state, booking.doctorId, occurrenceId) }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .toSorted((a, b) => a.occurrence.startsAt.localeCompare(b.occurrence.startsAt))
    .slice(0, 3)
  const tiles = [
    { label: "Needs attention", value: entries.filter((item) => item.staffing.status === "action_required").length, tone: "danger" },
    { label: "Applications to review", value: withinWeek.reduce((sum, item) => sum + item.staffing.applicationsPending, 0), tone: "info" },
    { label: "Invites awaiting response", value: withinWeek.reduce((sum, item) => sum + item.staffing.invitesPending, 0), tone: "violet" },
    { label: "Fully staffed this week", value: withinWeek.filter((item) => item.staffing.status === "confirmed" || item.staffing.status === "completed").length, tone: "success" },
  ] as const

  return <><PageTitle eyebrow="Clinic workspace" title="Today" detail="A staffing control view of open vacancies, invitations, applications and confirmed doctors by date." />
    {welcomeNotification && <section className="df-priority"><div><span className="df-kicker">Get started</span><h2>{welcomeNotification.title}</h2><p>{welcomeNotification.detail}</p></div><Link className="df-primary" href={welcomeNotification.href}>Post a vacancy <ChevronRight size={17} /></Link></section>}
    {candidateUnread.length > 0 && <section className="df-priority"><div><span className="df-kicker">Needs attention</span><h2>{candidateUnread.length} candidate updates to review</h2><p>Open each candidate to acknowledge their application or message. They will see the first-view timestamp.</p></div><Link className="df-primary" href={`/clinic/${actor.organisationId}/inbox`}>Open communication centre <ChevronRight size={17} /></Link></section>}
    <div className="df-stat-row">{tiles.map((tile) => <div className={`df-stat-tile ${tile.tone}`} key={tile.label}><strong>{tile.value}</strong><span>{tile.label}</span></div>)}</div>
    <section className="df-panel df-confirmed-panel">
      <div className="df-section-head"><div><span>Confirmed</span><h2>Upcoming confirmed doctors</h2></div></div>
      {confirmedUpcoming.length ? confirmedUpcoming.map((entry) => { const confirmation = confirmationStatus(entry.readiness); return <div className="df-record" key={entry.occurrence.id}><div><strong>{entry.doctor?.name ?? "Doctor"}</strong><span>{entry.requirement.specialty} · {entry.site?.name}</span><span>{shortDate(entry.occurrence.startsAt)} · {timeRange(entry.occurrence)}</span></div><div className="df-record-actions"><Status tone={confirmation.tone}>{confirmation.label}</Status>{confirmation.tone === "warning" && <button disabled={busy} className="df-secondary compact" type="button" onClick={() => command("confirm-readiness", entry.occurrence.id, entry.occurrence.version, { doctorId: entry.booking.doctorId })}>{busy ? "Confirming…" : "Approve readiness"}</button>}<Link aria-label={`View ${entry.doctor?.name ?? "doctor"}'s engagement`} href={`/engagements/${entry.booking.engagementId}`}><ChevronRight size={18} /></Link></div></div> }) : <Empty title="No confirmed doctors yet" detail="Once a doctor accepts terms, they'll appear here by date." />}
    </section>
    <section className="df-panel df-cal-panel">
      <div className="df-section-head"><div><span>Calendar</span><h2>Staffing by date</h2></div></div>
      <div className="df-cal-head"><button type="button" className="df-cal-nav" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft size={18} /></button><strong>{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(monthStart)}</strong><button type="button" className="df-cal-nav" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight size={18} /></button></div>
      <div className="df-cal-weekdays" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => <span key={label}>{label}</span>)}</div>
      <div className="df-cal-grid">{cells.map((cellDate) => {
        const key = cellDate.toDateString()
        const inMonth = cellDate.getMonth() === monthStart.getMonth()
        const statusesPresent = new Set((entriesByDay.get(key) ?? []).map((item) => item.staffing.status))
        const summary = CALENDAR_DOT_ORDER.filter((item) => statusesPresent.has(item)).map((item) => CALENDAR_STATUS_META[item].label)
        return <button type="button" key={key} className={`df-cal-day${inMonth ? "" : " outside"}${key === todayKey ? " today" : ""}${key === selectedDay ? " selected" : ""}`} onClick={() => setSelectedDay(key)} aria-pressed={key === selectedDay} aria-label={`${new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(cellDate)}${summary.length ? `, ${summary.join(", ")}` : ""}`}><span className="df-cal-daynum">{cellDate.getDate()}</span><span className="df-cal-dots">{CALENDAR_DOT_ORDER.filter((item) => statusesPresent.has(item)).map((item) => <i className={`df-cal-dot ${calendarDotClass(item)}`} key={item} />)}</span></button>
      })}</div>
      <div className="df-cal-legend">{CALENDAR_DOT_ORDER.map((status) => <span key={status}><i className={`df-cal-dot ${calendarDotClass(status)}`} />{CALENDAR_STATUS_META[status].label}</span>)}</div>
    </section>
    <section className="df-panel df-cal-detail">
      <div className="df-section-head"><div><span>{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(selectedDay))}</span><h2>{selectedEntries.length ? `${selectedEntries.length} session${selectedEntries.length === 1 ? "" : "s"}` : "No activity"}</h2></div></div>
      {selectedEntries.map((entry) => <button type="button" className={`df-record as-button df-cal-entry${entry.staffing.status === "action_required" ? " needs-action" : ""}`} key={entry.occurrence.id} onClick={() => setOpenOccurrenceId(entry.occurrence.id)}><div><strong>{entry.requirement.specialty}</strong><span>{entry.site?.name} · {timeRange(entry.occurrence)}</span></div><div className="df-cal-entry-badges">{entry.requirement.urgent && <Status tone="danger"><AlertTriangle size={13} /> Urgent</Status>}<span className="df-fill-badge">{entry.occurrence.reserved}/{entry.occurrence.capacity} filled</span><CalendarStatusBadge status={entry.staffing.status} /></div></button>)}
      {!selectedEntries.length && <Empty title="Nothing scheduled" detail="Publish a vacancy to see it appear here by date." />}
    </section>
    <ClinicOccurrenceDialog state={state} busy={busy} command={command} occurrenceId={openOccurrenceId} onClose={() => setOpenOccurrenceId(undefined)} />
  </>
}

function ClinicOccurrenceDialog({ state, busy, command, occurrenceId, onClose }: { state: WorkspaceState; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown>; occurrenceId?: string; onClose: () => void }) {
  const portalContainer = usePortalContainer()
  const occurrence = state.occurrences.find((item) => item.id === occurrenceId)
  return <Dialog.Root open={Boolean(occurrence)} onOpenChange={(open) => { if (!open) onClose() }}><Dialog.Portal container={portalContainer}><Dialog.Overlay className="df-dialog-overlay" /><Dialog.Content className="df-form-dialog df-occurrence-dialog"><Dialog.Close className="df-dialog-close" aria-label="Close session details"><X size={20} /></Dialog.Close>{occurrence && <ClinicOccurrenceDetail state={state} busy={busy} command={command} occurrence={occurrence} />}</Dialog.Content></Dialog.Portal></Dialog.Root>
}

function ClinicOccurrenceDetail({ state, busy, command, occurrence }: { state: WorkspaceState; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown>; occurrence: SessionOccurrence }) {
  const requirement = state.requirements.find((item) => item.id === occurrence.requirementId)
  if (!requirement) return null
  const site = state.sites.find((item) => item.id === occurrence.siteId)
  const staffing = classifyOccurrenceStaffing(state, occurrence.id)
  const engagements = state.engagements.filter((item) => item.requirementId === occurrence.requirementId && item.selectedOccurrenceIds.includes(occurrence.id))
  const applicants = engagements.filter((item) => item.stage === "applied")
  const invitees = engagements.filter((item) => item.origins.includes("invitation") && item.stage === "invited")
  const pendingOffers = state.offers.filter((item) => item.occurrenceIds.includes(occurrence.id) && item.status === "sent")
  const bookings = state.bookings.filter((item) => item.occurrenceIds.includes(occurrence.id))
  const shiftEnded = new Date(occurrence.endsAt).getTime() <= new Date().getTime()
  const canConfirmCompletion = occurrence.state === "booked" || occurrence.state === "discrepancy"

  return <>
    <Dialog.Title>{requirement.specialty} · {requirement.title}</Dialog.Title>
    <Dialog.Description>{site?.name} · {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(occurrence.startsAt))} · {timeRange(occurrence)}</Dialog.Description>
    <div className="df-occurrence-summary">{requirement.urgent && <Status tone="danger"><AlertTriangle size={13} /> Urgent</Status>}<CalendarStatusBadge status={staffing.status} /><span>{occurrence.reserved} of {occurrence.capacity} position{occurrence.capacity === 1 ? "" : "s"} filled</span></div>
    <div className="df-progress"><span style={{ width: `${occurrence.capacity ? Math.min(100, (occurrence.reserved / occurrence.capacity) * 100) : 0}%` }} /></div>
    {staffing.unfilled > 0 ? <div className="df-note"><AlertTriangle size={17} /><p>{staffing.unfilled} more doctor{staffing.unfilled === 1 ? "" : "s"} needed for this session.</p></div> : <div className="df-note"><Check size={17} /><p>Fully staffed. No further doctors are needed for this session.</p></div>}

    {bookings.length > 0 && <><h3>Confirmed doctors</h3>{bookings.map((booking) => { const doctor = state.doctors.find((item) => item.id === booking.doctorId); const confirmation = confirmationStatus(calculateOccurrenceReadiness(state, booking.doctorId, occurrence.id)); return <div className="df-record" key={booking.id}><div><strong>{doctor?.name}</strong><span>{doctor?.specialty}</span></div><div className="df-record-actions"><div className="df-cal-entry-badges"><Status tone={confirmation.tone}>{confirmation.label}</Status>{(occurrence.state === "completed" || occurrence.doctorConfirmedAt) && <Status tone={occurrence.state === "completed" ? "slate" : "success"}>{occurrence.state === "completed" ? "Completed" : "Attendance confirmed"}</Status>}</div>{confirmation.tone === "warning" && <button disabled={busy} className="df-secondary compact" type="button" onClick={() => command("confirm-readiness", occurrence.id, occurrence.version, { doctorId: booking.doctorId })}>{busy ? "Confirming…" : "Approve readiness"}</button>}</div></div> })}</>}

    {applicants.length > 0 && <><h3>Applications received ({applicants.length})</h3>{applicants.map((engagement) => { const doctor = state.doctors.find((item) => item.id === engagement.doctorId); return <div className="df-record" key={engagement.id}><div><strong>{doctor?.name}</strong><span>{doctor?.specialty}</span></div></div> })}</>}

    {invitees.length > 0 && <><h3>Invitations awaiting response ({invitees.length})</h3>{invitees.map((engagement) => { const doctor = state.doctors.find((item) => item.id === engagement.doctorId); return <div className="df-record" key={engagement.id}><div><strong>{doctor?.name}</strong><span>{doctor?.specialty}</span></div></div> })}</>}

    {pendingOffers.length > 0 && <><h3>Pending offers ({pendingOffers.length})</h3>{pendingOffers.map((offer) => { const engagement = state.engagements.find((item) => item.id === offer.engagementId); const doctor = state.doctors.find((item) => item.id === engagement?.doctorId); return <Link className="df-record" href={`/offers/${offer.id}`} key={offer.id}><div><strong>{doctor?.name}</strong><span>Expires {date(offer.expiresAt)}</span></div><ChevronRight size={18} /></Link> })}</>}

    <div className="df-detail-actions">
      {applicants.length > 0 && <Link className="df-secondary" href={`/clinic/${requirement.organisationId}/hiring/candidates?stage=all&q=${encodeURIComponent(requirement.title)}`}>View applicants</Link>}
      {staffing.unfilled > 0 && <Link className="df-secondary" href={`/clinic/${requirement.organisationId}/doctors?requirement=${requirement.id}`}><UserPlus size={16} /> Invite doctor</Link>}
      {pendingOffers.length === 1 && <Link className="df-secondary" href={`/offers/${pendingOffers[0].id}`}>Review offer</Link>}
      {canConfirmCompletion && shiftEnded && <button disabled={busy} className="df-primary" type="button" onClick={() => command("mark-complete", occurrence.id, occurrence.version)}>{busy ? "Confirming…" : "Confirm completion"}</button>}
    </div>
  </>
}

function Vacancies({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) {
  const reqs = state.requirements.filter((item) => item.organisationId === actor.organisationId)
  return <><PageTitle eyebrow="Hiring workspace" title="Vacancies" detail={`${reqs.length} requirements across your authorised clinic sites.`} actions={<VacancyComposer state={state} actor={actor} busy={busy} command={command} />} /><HiringNav actor={actor} active="vacancies" /><section className="df-panel df-table-panel"><GroupHeader tone="blue" title="Clinic requirements" count={reqs.length} /><table className="df-table df-responsive-table"><thead><tr><th>Vacancy</th><th>Site</th><th>Coverage</th><th>Rate</th><th>Status</th></tr></thead><tbody>{reqs.map((req) => <tr key={req.id}><td data-label="Vacancy"><Link href={`/clinic/${actor.organisationId}/hiring/candidates?requirement=${req.id}`}><strong>{req.title}</strong><span>{req.scope}</span></Link></td><td data-label="Site">{state.sites.find((site) => site.id === req.siteId)?.name}</td><td data-label="Coverage">{requirementCoverage(state, req.id).label}</td><td data-label="Rate">{money(req.rateMinor)}</td><td data-label="Status"><Status tone={req.status === "published" ? "success" : "neutral"}>{stage(req.status)}</Status>{req.urgent && <Status tone="danger"><AlertTriangle size={13} /> Urgent</Status>}{req.status === "published" && <Urgency deadline={req.deadline} />}</td></tr>)}</tbody></table></section></>
}

function VacancyComposer({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) {
  const portalContainer = usePortalContainer()
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(""); const [scope, setScope] = useState("Adult outpatient dermatology"); const [siteId, setSiteId] = useState(actor.siteIds[0] ?? ""); const [rate, setRate] = useState("600"); const [startDate, setStartDate] = useState(""); const [startTime, setStartTime] = useState("09:00"); const [urgent, setUrgent] = useState(false)
  async function publish() { const result = await command("publish", "new-requirement", 0, { title, scope, siteId, rateMinor: Number(rate) * 100, startsAt: startDate ? [londonWallTimeToIso(startDate, startTime || "09:00")] : [], urgent }); if ((result as { success?: boolean })?.success) { setOpen(false); setTitle(""); setStartDate(""); setUrgent(false) } }
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><button className="df-primary" type="button">Create vacancy</button></Dialog.Trigger><Dialog.Portal container={portalContainer}><Dialog.Overlay className="df-dialog-overlay" /><Dialog.Content className="df-form-dialog"><Dialog.Title>Create a clinic vacancy</Dialog.Title><Dialog.Description>Publish a clear requirement doctors can review and apply to.</Dialog.Description><Dialog.Close className="df-dialog-close" aria-label="Close vacancy form"><X size={20} /></Dialog.Close><div className="df-dialog-form"><label>Vacancy title<input name="vacancy-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Saturday dermatology cover" /></label><label>Clinic site<select name="vacancy-site" value={siteId} onChange={(event) => setSiteId(event.target.value)}>{state.sites.filter((site) => actor.siteIds.includes(site.id)).map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label><label>Clinical scope<input name="vacancy-scope" value={scope} onChange={(event) => setScope(event.target.value)} /></label><label>Rate per session<div className="df-money-input"><span>£</span><input name="vacancy-rate" inputMode="numeric" type="number" min="100" value={rate} onChange={(event) => setRate(event.target.value)} /></div></label><div className="df-form-row"><label>First session date<input name="vacancy-starts-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>First session time<select name="vacancy-starts-time" value={startTime} onChange={(event) => setStartTime(event.target.value)}>{["08:00", "09:00", "10:00", "12:00", "13:00", "14:00", "17:00", "18:00"].map((time) => <option value={time} key={time}>{time}</option>)}</select></label></div><label className="df-checkbox-field" htmlFor="vacancy-urgent"><input id="vacancy-urgent" name="vacancy-urgent" type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} />Mark as urgent — doctors will see a simple &quot;Urgent&quot; badge</label><div className="df-dialog-note"><ShieldCheck size={17} /><span>Publishing creates a real demo requirement and notifies no doctor until they apply or are invited.</span></div><button disabled={busy || !title.trim() || !startDate} className="df-primary" type="button" onClick={publish}>{busy ? "Publishing…" : "Publish vacancy"}</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}

function Candidates({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) {
  const params = useSearchParams(); const router = useRouter(); const selected = params.get("candidateId"); const filter = params.get("stage") ?? "all"; const query = params.get("q") ?? ""
  const scopedEngagements = state.engagements.filter((eng) => state.requirements.find((req) => req.id === eng.requirementId)?.organisationId === actor.organisationId)
  const engagements = scopedEngagements.filter((eng) => filter === "all" || eng.stage === filter).filter((eng) => { const doctor = state.doctors.find((item) => item.id === eng.doctorId); const req = state.requirements.find((item) => item.id === eng.requirementId); return `${doctor?.name ?? ""} ${req?.title ?? ""}`.toLowerCase().includes(query.toLowerCase()) })
  const selectedEng = scopedEngagements.find((item) => item.id === selected)
  function updateQuery(value: string) { const next = new URLSearchParams(params.toString()); if (value) next.set("q", value); else next.delete("q"); next.delete("candidateId"); router.replace(`?${next.toString()}`) }
  const filterHref = (nextStage: string) => `?${new URLSearchParams({ ...(query ? { q: query } : {}), stage: nextStage }).toString()}`
  return <><PageTitle eyebrow="Hiring workspace" title="Candidates" detail={`${engagements.length} candidate engagement records. Applications and invitations share one record.`} /><HiringNav actor={actor} active="candidates" />
    <div className="df-filterbar"><Search size={18} /><input name="candidate-search" value={query} onChange={(event) => updateQuery(event.target.value)} aria-label="Search candidates" placeholder="Search name or vacancy" /><Link className={filter === "all" ? "selected" : ""} href={filterHref("all")}>All</Link><Link className={filter === "applied" ? "selected" : ""} href={filterHref("applied")}>New applications</Link><Link className={filter === "shortlisted" ? "selected" : ""} href={filterHref("shortlisted")}>Shortlisted</Link></div>
    <div className={`df-workbench ${selectedEng ? "has-detail" : ""}`}><section className="df-panel df-table-panel"><GroupHeader tone="purple" title="Candidate engagements" count={engagements.length} /><table className="df-table df-responsive-table"><thead><tr><th>Doctor</th><th>Vacancy</th><th>Origin</th><th>Dates</th><th>Stage</th><th>Last activity</th></tr></thead><tbody>{engagements.map((eng) => { const doctor = state.doctors.find((d) => d.id === eng.doctorId); const req = state.requirements.find((r) => r.id === eng.requirementId); const linkParams = new URLSearchParams({ stage: filter, candidateId: eng.id, ...(query ? { q: query } : {}) }); return <tr key={eng.id} className={selected === eng.id ? "is-selected" : ""}><td data-label="Doctor"><Link href={`?${linkParams.toString()}`}><span className="df-avatar small">{doctor?.initials}</span><strong>{doctor?.name}</strong></Link></td><td data-label="Vacancy">{req?.title}</td><td data-label="Origin">{eng.origins.map(stage).join(" + ")}</td><td data-label="Dates">{eng.selectedOccurrenceIds.length}</td><td data-label="Stage"><Status tone={eng.stage === "offer_sent" ? "info" : eng.stage === "shortlisted" ? "success" : "neutral"}>{stage(eng.stage)}</Status></td><td data-label="Last activity">{eng.lastContactAt ? date(eng.lastContactAt) : "No contact"}</td></tr> })}</tbody></table>{!engagements.length && <Empty title="No candidates match" detail="Clear the search or stage filter to see active candidates." />}</section>
      {selectedEng && <CandidateDetail state={state} actor={actor} engagement={selectedEng} busy={busy} command={command} closeHref={filterHref(filter)} />}</div></>
}

function Offers({ state, actor }: { state: WorkspaceState; actor: WorkspaceUser }) {
  const scopedEngagements = state.engagements.filter((eng) => state.requirements.find((req) => req.id === eng.requirementId)?.organisationId === actor.organisationId)
  const engagementIds = new Set(scopedEngagements.map((eng) => eng.id)); const offers = state.offers.filter((offer) => engagementIds.has(offer.engagementId))
  return <><PageTitle eyebrow="Hiring workspace" title="Offers" detail={`${offers.length} structured offer versions with an immutable audit trail.`} /><HiringNav actor={actor} active="offers" /><section className="df-panel df-table-panel"><GroupHeader tone="green" title="Offer register" count={offers.length} /><table className="df-table df-responsive-table"><thead><tr><th>Doctor</th><th>Vacancy</th><th>Version</th><th>Value</th><th>Expires</th><th>Status</th></tr></thead><tbody>{offers.map((offer) => { const eng = state.engagements.find((item) => item.id === offer.engagementId); const doctor = state.doctors.find((item) => item.id === eng?.doctorId); const req = state.requirements.find((item) => item.id === eng?.requirementId); return <tr key={offer.id}><td data-label="Doctor"><Link href={`/offers/${offer.id}`}><span className="df-avatar small">{doctor?.initials}</span><strong>{doctor?.name}</strong></Link></td><td data-label="Vacancy">{req?.title}</td><td data-label="Version">Version {offer.version}</td><td data-label="Value">{money(offer.totalMinor)}</td><td data-label="Expires">{date(offer.expiresAt)}</td><td data-label="Status"><Status tone={offer.status === "accepted" ? "success" : offer.status === "sent" ? "info" : "neutral"}>{stage(offer.status)}</Status></td></tr> })}</tbody></table>{!offers.length && <Empty title="No offers yet" detail="Structured offers will appear here after a candidate reaches discussion." />}</section></>
}

function CandidateDetail({ state, actor, engagement, busy, command, closeHref }: { state: WorkspaceState; actor: WorkspaceUser; engagement: CandidateEngagement; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown>; closeHref: string }) {
  const doctor = state.doctors.find((item) => item.id === engagement.doctorId); const req = state.requirements.find((item) => item.id === engagement.requirementId)
  const currentOffer = state.offers.filter((item) => item.engagementId === engagement.id).toSorted((a, b) => b.version - a.version)[0]
  return <aside className="df-detail" aria-label="Candidate details"><div className="df-detail-head"><div><span className="df-avatar">{doctor?.initials}</span><div><span>Candidate record</span><h2>{doctor?.name}</h2><p>{doctor?.specialty} · {doctor?.baseArea}</p></div></div><Link href={closeHref} aria-label="Close candidate details"><LogOut size={19} /></Link></div><div className="df-detail-tabs"><span className="active">Overview</span><Link href={`/engagements/${engagement.id}`}>Conversation</Link><span>Checks</span><span>Activity</span></div><div className="df-detail-body"><Status tone="info">{stage(engagement.stage)}</Status><h3>{req?.title}</h3><p>{engagement.selectedOccurrenceIds.length} selected occurrence(s) · {engagement.origins.map(stage).join(" and ")}</p><EngagementLifecycle state={state} actor={actor} engagement={engagement} /><dl><div><dt>Expected rate</dt><dd>{doctor && money(doctor.expectedRateMinor)} / session</dd></div><div><dt>Availability</dt><dd>{doctor && stage(doctor.availabilityState)}</dd></div><div><dt>Evidence</dt><dd>{doctor?.evidenceSummary}</dd></div></dl><div className="df-note"><ShieldCheck size={18} /><p>Fit is explained from matching facts. Doc+Find does not score clinical competence.</p></div></div><div className="df-detail-actions"><Link className="df-secondary" href={`/engagements/${engagement.id}`}><MessageSquare size={17} /> Message</Link>{engagement.stage === "applied" && <button disabled={busy} className="df-primary" type="button" onClick={() => command("shortlist", engagement.id, engagement.version)}>Shortlist</button>}{engagement.stage === "shortlisted" && <button disabled={busy} className="df-primary" type="button" onClick={() => command("start-discussion", engagement.id, engagement.version)}>Start discussion</button>}{engagement.stage === "in_discussion" && doctor && req && <OfferComposer engagement={engagement} doctor={doctor} requirement={req} busy={busy} command={command} />}{engagement.stage === "offer_sent" && currentOffer && <Link className="df-primary" href={`/offers/${currentOffer.id}`}>View offer</Link>}{engagement.stage === "terms_accepted" && <span className="df-waiting">Terms accepted · readiness tracked separately</span>}</div></aside>
}

function OfferComposer({ engagement, doctor, requirement, busy, command }: { engagement: CandidateEngagement; doctor: WorkspaceState["doctors"][number]; requirement: WorkspaceState["requirements"][number]; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) {
  const portalContainer = usePortalContainer()
  const [open, setOpen] = useState(false); const [rate, setRate] = useState(String(doctor.expectedRateMinor / 100)); const [paymentTerms, setPaymentTerms] = useState("Payment due within 30 days of invoice")
  async function sendOffer() { const result = await command("send-offer", engagement.id, engagement.version, { occurrenceIds: engagement.selectedOccurrenceIds, rateMinor: Number(rate) * 100, paymentTerms }); if ((result as { success?: boolean })?.success) setOpen(false) }
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><button className="df-primary" type="button">Create offer</button></Dialog.Trigger><Dialog.Portal container={portalContainer}><Dialog.Overlay className="df-dialog-overlay" /><Dialog.Content className="df-form-dialog"><Dialog.Title>Offer terms for {doctor.name}</Dialog.Title><Dialog.Description>These terms become an immutable version after sending.</Dialog.Description><Dialog.Close className="df-dialog-close" aria-label="Close offer form"><X size={20} /></Dialog.Close><div className="df-offer-summary"><span>{requirement.title}</span><strong>{engagement.selectedOccurrenceIds.length} selected session(s)</strong></div><div className="df-dialog-form"><label>Rate per session<div className="df-money-input"><span>£</span><input name="offer-rate" inputMode="numeric" type="number" min="100" value={rate} onChange={(event) => setRate(event.target.value)} /></div></label><label>Payment terms<input name="offer-payment-terms" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} /></label><div className="df-dialog-note"><ShieldCheck size={17} /><span>Sending an offer does not accept it or make the doctor ready to work.</span></div><button disabled={busy || !rate} className="df-primary" type="button" onClick={sendOffer}>{busy ? "Sending…" : `Send ${money(Number(rate) * 100)} offer`}</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
}

function DoctorProfileDialog({ doctor }: { doctor: DoctorProfile }) {
  const portalContainer = usePortalContainer()
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button type="button" className="df-doctor-card-identity" aria-label={`Open ${doctor.name}'s profile`}>
        <span className="df-avatar">{doctor.initials}</span>
        <div><h2>{doctor.name}</h2><p>{doctor.specialty} · {doctor.baseArea}</p></div>
      </button>
    </Dialog.Trigger>
    <Dialog.Portal container={portalContainer}>
      <Dialog.Overlay className="df-dialog-overlay" />
      <Dialog.Content className="df-form-dialog df-profile-dialog">
        <Dialog.Close className="df-dialog-close" aria-label="Close doctor profile"><X size={20} /></Dialog.Close>
        <div className="df-profile-head"><span className="df-avatar large">{doctor.initials}</span><div><Dialog.Title>{doctor.name}</Dialog.Title><Dialog.Description>{doctor.grade ?? doctor.specialty} · {doctor.currentOrganisation ?? doctor.baseArea}</Dialog.Description></div></div>
        {doctor.bio && <p className="df-profile-bio">{doctor.bio}</p>}
        <dl className="df-profile-facts">
          <div><dt>Specialty</dt><dd>{doctor.specialty}</dd></div>
          <div><dt>Scope</dt><dd>{doctor.scopes.join(", ") || "Not specified"}</dd></div>
          <div><dt>Base location</dt><dd>{doctor.baseArea} · travels up to {doctor.travelRadiusMiles} miles</dd></div>
          <div><dt>Experience</dt><dd>{doctor.experience}</dd></div>
          <div><dt>Evidence</dt><dd>{doctor.evidenceSummary}</dd></div>
          <div><dt>Registration</dt><dd>{doctor.registrationNumber ?? "Not provided"}</dd></div>
          <div><dt>Expected rate</dt><dd>{money(doctor.expectedRateMinor)} / session</dd></div>
          <div><dt>Availability</dt><dd>{doctor.availabilityState === "unknown" ? "Needs confirmation" : `${stage(doctor.availabilityState)} availability`}{doctor.availabilityPattern ? ` · ${doctor.availabilityPattern}` : ""}</dd></div>
          <div><dt>Contact preference</dt><dd>{stage(doctor.contactPreference)}</dd></div>
        </dl>
        <div className="df-dialog-note"><ShieldCheck size={17} /><span>Profile facts only. Availability and fit are self-declared, not a judgement of clinical competence.</span></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

function Doctors({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) {
  const [query, setQuery] = useState(""); const params = useSearchParams(); const requestedRequirementId = params.get("requirement")
  const req = state.requirements.find((item) => item.id === requestedRequirementId && item.organisationId === actor.organisationId && item.status === "published") ?? state.requirements.find((item) => item.organisationId === actor.organisationId && item.status === "published")
  const doctors = state.doctors.filter((item) => item.discoverable && `${item.name} ${item.specialty} ${item.baseArea}`.toLowerCase().includes(query.toLowerCase()))
  return <><PageTitle eyebrow="Doctor directory" title="Discover doctors" detail={`Search in context of ${req?.title ?? "an open vacancy"}. Availability is never inferred.`} /><div className="df-filterbar"><Search size={18} /><input name="doctor-directory-search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search doctor directory" placeholder="Name, specialty or location" /><span className="df-filter-pill">Dermatology</span><span className="df-filter-pill">London</span></div><div className="df-card-grid">{doctors.map((doctor) => { const invited = req && state.engagements.find((item) => item.doctorId === doctor.id && item.requirementId === req.id && item.origins.includes("invitation")); return <article className="df-doctor-card" key={doctor.id}><DoctorProfileDialog doctor={doctor} /><Status tone={doctor.availabilityState === "confirmed" ? "success" : "warning"}>{doctor.availabilityState === "unknown" ? "Needs confirmation" : `${stage(doctor.availabilityState)} availability`}</Status><ul><li>{doctor.experience}</li><li>{doctor.evidenceSummary}</li><li>{doctor.availableOccurrenceIds.length} matching date(s)</li></ul><footer><strong>{money(doctor.expectedRateMinor)} <small>/ session</small></strong>{req && (invited ? <Link className="df-secondary" href={`/engagements/${invited.id}`}>Invited</Link> : <button disabled={busy} type="button" className="df-primary" onClick={() => command("invite", req.id, req.version, { doctorId: doctor.id })}>Invite</button>)}</footer></article> })}</div></>
}

function DoctorSchedule({ state, actor }: { state: WorkspaceState; actor: WorkspaceUser }) {
  const [selected, setSelected] = useState(() => new Date().toDateString())
  const days = Array.from({ length: 14 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() + index); return day })

  const bookedOccurrenceIds = new Set(state.bookings.filter((item) => item.doctorId === actor.id).flatMap((item) => item.occurrenceIds))
  const pendingOccurrenceIds = new Set(state.engagements.filter((item) => item.doctorId === actor.id && item.stage !== "declined" && item.stage !== "withdrawn").flatMap((item) => item.selectedOccurrenceIds).filter((id) => !bookedOccurrenceIds.has(id)))

  type Entry = { occurrence: WorkspaceState["occurrences"][number]; pending: boolean; readiness?: ReturnType<typeof calculateOccurrenceReadiness> }
  const entries: Entry[] = []
  for (const id of bookedOccurrenceIds) { const occurrence = state.occurrences.find((item) => item.id === id); if (occurrence) entries.push({ occurrence, pending: false, readiness: calculateOccurrenceReadiness(state, actor.id, id) }) }
  for (const id of pendingOccurrenceIds) { const occurrence = state.occurrences.find((item) => item.id === id); if (occurrence) entries.push({ occurrence, pending: true }) }

  function dotTone(day: Date) {
    const dayEntries = entries.filter((entry) => new Date(entry.occurrence.startsAt).toDateString() === day.toDateString())
    if (!dayEntries.length) return undefined
    if (dayEntries.some((entry) => entry.occurrence.state === "discrepancy")) return "danger"
    if (dayEntries.some((entry) => entry.pending || entry.readiness?.state !== "ready")) return "warning"
    return "success"
  }

  const selectedDate = new Date(selected)
  const dayEntries = entries.filter((entry) => new Date(entry.occurrence.startsAt).toDateString() === selectedDate.toDateString()).toSorted((a, b) => a.occurrence.startsAt.localeCompare(b.occurrence.startsAt))

  return <><PageTitle eyebrow="Schedule" title="Your week" detail="Confirmed sessions and pending applications, day by day." />
    <div className="df-week-strip">{days.map((day) => { const tone = dotTone(day); const isSelected = day.toDateString() === selectedDate.toDateString(); return <button key={day.toISOString()} type="button" className={`df-week-day ${isSelected ? "selected" : ""}`} onClick={() => setSelected(day.toDateString())}><small>{new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(day)}</small><strong>{day.getDate()}</strong>{tone ? <i className={`df-week-dot ${tone}`} /> : <i className="df-week-dot" style={{ background: "transparent" }} />}</button> })}</div>
    <section className="df-panel">
      <div className="df-section-head"><div><span>{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(selectedDate)}</span><h2>{dayEntries.length} session{dayEntries.length === 1 ? "" : "s"}</h2></div></div>
      {dayEntries.length ? dayEntries.map((entry) => { const requirement = state.requirements.find((item) => item.occurrenceIds.includes(entry.occurrence.id)); const site = requirement && state.sites.find((item) => item.id === requirement.siteId); return <div className="df-record" key={entry.occurrence.id}><div><strong>{date(entry.occurrence.startsAt)}</strong><span>{requirement?.title} · {site?.name}</span></div><Status tone={entry.occurrence.state === "discrepancy" ? "danger" : entry.pending ? "warning" : entry.readiness?.state === "ready" ? "success" : "warning"}>{entry.pending ? "Awaiting offer" : entry.occurrence.state === "discrepancy" ? "Discrepancy reported" : stage(entry.readiness?.state ?? "")}</Status></div> }) : <Empty title="Nothing on this day" detail="Browse Find work to apply for open sessions." />}
    </section>
  </>
}

type DoctorWorkEntry = { kind: "confirmed" | "pending"; occurrence: SessionOccurrence; requirement?: Requirement; site?: Site; engagementId?: string; readiness?: ReadinessResult }
type DoctorVacancyEntry = { occurrence: SessionOccurrence; requirement: Requirement; site?: Site; matches: boolean; urgent: boolean }

function singleEntryHref(dayWork: DoctorWorkEntry[], dayVacancies: DoctorVacancyEntry[]) {
  if (dayWork.length + dayVacancies.length !== 1) return undefined
  if (dayWork.length === 1) return dayWork[0].engagementId ? `/engagements/${dayWork[0].engagementId}` : "/doctor/schedule"
  return "/doctor/find-work"
}

function DoctorWorkCalendar({ state, actor }: { state: WorkspaceState; actor: WorkspaceUser }) {
  const router = useRouter()
  const [monthStart, setMonthStart] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState(() => new Date().toDateString())

  const doctorProfile = state.doctors.find((item) => item.id === actor.id)
  const bookedOccurrenceIds = new Set(state.bookings.filter((item) => item.doctorId === actor.id).flatMap((item) => item.occurrenceIds))
  const pendingOccurrenceIds = new Set(state.engagements.filter((item) => item.doctorId === actor.id && item.stage !== "declined" && item.stage !== "withdrawn").flatMap((item) => item.selectedOccurrenceIds).filter((id) => !bookedOccurrenceIds.has(id)))
  const ownOccurrenceIds = new Set([...bookedOccurrenceIds, ...pendingOccurrenceIds])

  const workEntries: DoctorWorkEntry[] = []
  for (const id of bookedOccurrenceIds) {
    const occurrence = state.occurrences.find((item) => item.id === id)
    if (!occurrence) continue
    const requirement = state.requirements.find((item) => item.id === occurrence.requirementId)
    const site = requirement && state.sites.find((item) => item.id === requirement.siteId)
    const booking = state.bookings.find((item) => item.doctorId === actor.id && item.occurrenceIds.includes(id))
    workEntries.push({ kind: "confirmed", occurrence, requirement, site, engagementId: booking?.engagementId, readiness: calculateOccurrenceReadiness(state, actor.id, id) })
  }
  for (const id of pendingOccurrenceIds) {
    const occurrence = state.occurrences.find((item) => item.id === id)
    if (!occurrence) continue
    const requirement = state.requirements.find((item) => item.id === occurrence.requirementId)
    const site = requirement && state.sites.find((item) => item.id === requirement.siteId)
    const engagement = state.engagements.find((item) => item.doctorId === actor.id && item.selectedOccurrenceIds.includes(id) && item.stage !== "declined" && item.stage !== "withdrawn")
    workEntries.push({ kind: "pending", occurrence, requirement, site, engagementId: engagement?.id })
  }

  const vacancyEntries: DoctorVacancyEntry[] = state.requirements
    .filter((req) => req.status === "published")
    .flatMap((req) => req.occurrenceIds
      .filter((id) => !ownOccurrenceIds.has(id))
      .map((id) => state.occurrences.find((item) => item.id === id))
      .filter((occ): occ is SessionOccurrence => Boolean(occ))
      .map((occurrence) => ({ occurrence, requirement: req, site: state.sites.find((item) => item.id === req.siteId), matches: doctorProfile ? req.specialty === doctorProfile.specialty : false, urgent: daysUntil(req.deadline) >= 0 && daysUntil(req.deadline) <= 7 })))

  const workByDay = new Map<string, DoctorWorkEntry[]>()
  for (const entry of workEntries) { const key = dayKey(entry.occurrence.startsAt); workByDay.set(key, [...(workByDay.get(key) ?? []), entry]) }
  const vacancyByDay = new Map<string, DoctorVacancyEntry[]>()
  for (const entry of vacancyEntries) { const key = dayKey(entry.occurrence.startsAt); vacancyByDay.set(key, [...(vacancyByDay.get(key) ?? []), entry]) }

  function shiftMonth(delta: number) {
    const next = new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1)
    setMonthStart(next)
    const today = new Date()
    setSelectedDay(next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth() ? today.toDateString() : next.toDateString())
  }

  const cells = monthGrid(monthStart)
  const todayKey = new Date().toDateString()
  const selectedWork = (workByDay.get(selectedDay) ?? []).toSorted((a, b) => a.occurrence.startsAt.localeCompare(b.occurrence.startsAt))
  const selectedVacancies = (vacancyByDay.get(selectedDay) ?? []).toSorted((a, b) => a.occurrence.startsAt.localeCompare(b.occurrence.startsAt))

  return <>
    <section className="df-panel df-cal-panel">
      <div className="df-section-head"><div><span>Calendar</span><h2>Your work at a glance</h2></div></div>
      <div className="df-cal-head"><button type="button" className="df-cal-nav" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft size={18} /></button><strong>{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(monthStart)}</strong><button type="button" className="df-cal-nav" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight size={18} /></button></div>
      <div className="df-cal-weekdays" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => <span key={label}>{label}</span>)}</div>
      <div className="df-cal-grid">{cells.map((cellDate) => {
        const key = cellDate.toDateString()
        const inMonth = cellDate.getMonth() === monthStart.getMonth()
        const dayWork = workByDay.get(key) ?? []
        const dayVacancies = vacancyByDay.get(key) ?? []
        const hasConfirmed = dayWork.some((entry) => entry.kind === "confirmed")
        const hasPending = dayWork.some((entry) => entry.kind === "pending")
        const hasMatch = dayVacancies.some((entry) => entry.matches)
        const hasVacancy = dayVacancies.some((entry) => !entry.matches)
        const hasUrgent = dayVacancies.some((entry) => entry.urgent)
        const itemCount = dayWork.length + dayVacancies.length
        const directHref = singleEntryHref(dayWork, dayVacancies)
        return <button type="button" key={key} className={`df-cal-day${inMonth ? "" : " outside"}${key === todayKey ? " today" : ""}${key === selectedDay ? " selected" : ""}`} onClick={() => { setSelectedDay(key); if (directHref) router.push(directHref) }} aria-pressed={key === selectedDay} aria-label={`${new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(cellDate)}${itemCount ? `, ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}${directHref ? ", opens details" : ""}`}><span className="df-cal-daynum">{cellDate.getDate()}</span><span className="df-cal-dots">{hasConfirmed && <i className="df-cal-dot confirmed" />}{hasPending && <i className="df-cal-dot pending" />}{hasMatch && <i className="df-cal-dot match" />}{hasVacancy && <i className="df-cal-dot vacancy" />}{hasUrgent && <i className="df-cal-dot urgent" />}</span></button>
      })}</div>
      <div className="df-cal-legend"><span><i className="df-cal-dot confirmed" />Confirmed</span><span><i className="df-cal-dot pending" />Pending</span><span><i className="df-cal-dot match" />Matches you</span><span><i className="df-cal-dot vacancy" />Open vacancy</span><span><i className="df-cal-dot urgent" />Closing soon</span></div>
    </section>
    <section className="df-panel df-cal-detail">
      <div className="df-section-head"><div><span>{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(selectedDay))}</span><h2>{selectedWork.length + selectedVacancies.length ? `${selectedWork.length} shift${selectedWork.length === 1 ? "" : "s"} · ${selectedVacancies.length} opportunit${selectedVacancies.length === 1 ? "y" : "ies"}` : "No activity"}</h2></div></div>
      {selectedWork.map((entry) => { const confirmation = entry.kind === "confirmed" && entry.readiness ? confirmationStatus(entry.readiness) : undefined; return <Link className="df-record df-cal-entry" href={entry.engagementId ? `/engagements/${entry.engagementId}` : "/doctor/schedule"} key={entry.occurrence.id}><div><strong>{entry.site?.name ?? "Clinic"}</strong><span>{entry.requirement?.specialty} · {timeRange(entry.occurrence)}</span></div><Status tone={confirmation?.tone ?? "warning"}>{confirmation?.label ?? "Awaiting offer"}</Status></Link> })}
      {selectedVacancies.map((entry) => <Link className="df-record df-cal-entry vacancy" href="/doctor/find-work" key={entry.occurrence.id}><div><strong>{entry.site?.name}</strong><span>{entry.requirement.specialty} · {timeRange(entry.occurrence)} · {money(entry.requirement.rateMinor)}</span></div><div className="df-cal-entry-badges">{entry.matches && <Status tone="info">Matches you</Status>}{entry.requirement.urgent && <Status tone="danger"><AlertTriangle size={13} /> Urgent</Status>}<Urgency deadline={entry.requirement.deadline} /></div></Link>)}
      {!selectedWork.length && !selectedVacancies.length && <Empty title="Nothing on this day" detail="No confirmed work or open opportunities for this date." />}
    </section>
  </>
}

function DoctorToday({ state, actor, onOpenNotification }: { state: WorkspaceState; actor: WorkspaceUser; onOpenNotification: (notificationId: string, href: string) => void }) {
  const notification = state.notifications.find((item) => item.recipientId === actor.id && !item.readAt)
  const doctorEngagements = state.engagements.filter((item) => item.doctorId === actor.id)

  const upcoming = state.bookings.filter((item) => item.doctorId === actor.id)
    .flatMap((booking) => booking.occurrenceIds.map((occurrenceId) => ({ booking, occurrenceId })))
    .map(({ booking, occurrenceId }) => {
      const occurrence = state.occurrences.find((item) => item.id === occurrenceId)
      if (!occurrence) return undefined
      const requirement = state.requirements.find((item) => item.id === occurrence.requirementId)
      const site = requirement && state.sites.find((item) => item.id === requirement.siteId)
      return { booking, occurrence, requirement, site }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => new Date(item.occurrence.startsAt) >= new Date())
    .toSorted((a, b) => a.occurrence.startsAt.localeCompare(b.occurrence.startsAt))
    .slice(0, 3)

  const paidPayments = state.payments.filter((payment) => state.bookings.find((item) => item.id === payment.bookingId)?.doctorId === actor.id && payment.state === "paid")
  const confirmedMinor = paidPayments.reduce((sum, item) => sum + item.amountMinor, 0)

  return <><PageTitle eyebrow="Doctor workspace" title="Today" detail="Your most important action and upcoming work." />
    {notification && <section className="df-priority"><div><span className="df-kicker">{notification.category === "update" ? "Get started" : "Action needed"}</span><h2>{notification.title}</h2><p>{notification.category === "update" ? notification.detail : `${notification.detail}. Reviewing the offer does not accept it.`}</p></div><Link className="df-primary" href={notification.href} onClick={(event) => { event.preventDefault(); onOpenNotification(notification.id, notification.href) }}>{notification.category === "update" ? "Browse vacancies" : "Review safely"} <ChevronRight size={17} /></Link></section>}
    <DoctorWorkCalendar state={state} actor={actor} />
    <div className="df-dashboard-grid">
      <section className="df-panel"><div className="df-section-head"><div><span>Active opportunities</span><h2>Your conversations</h2></div></div>{doctorEngagements.length ? doctorEngagements.map((eng) => { const req = state.requirements.find((item) => item.id === eng.requirementId); return <Link className="df-record" href={`/engagements/${eng.id}`} key={eng.id}><div><strong>{req?.title}</strong><span>{eng.selectedOccurrenceIds.length} date(s) · {stage(eng.stage)}</span></div><ChevronRight size={18} /></Link> }) : <Empty title="No opportunities yet" detail="Applications and invitations will appear here." />}</section>
      <section className="df-panel"><div className="df-section-head"><div><span>Upcoming</span><h2>Your next sessions</h2></div><Link href="/doctor/schedule">View schedule</Link></div>{upcoming.length ? upcoming.map((entry) => { const confirmation = confirmationStatus(calculateOccurrenceReadiness(state, actor.id, entry.occurrence.id)); return <Link className="df-record" href={`/engagements/${entry.booking.engagementId}`} key={entry.occurrence.id}><div><strong>{entry.site?.name ?? "Clinic"}</strong><span>{entry.requirement?.specialty} · {entry.site?.area}</span><span>{shortDate(entry.occurrence.startsAt)} · {timeRange(entry.occurrence)}</span></div><Status tone={confirmation.tone}>{confirmation.label}</Status></Link> }) : <Empty title="Nothing booked yet" detail="Accepted offers will appear here." />}</section>
      <section className="df-panel"><div className="df-section-head"><div><span>Earnings</span><h2>{money(confirmedMinor)}</h2></div><Link href="/doctor/earnings">View earnings</Link></div><p className="df-mini-note">{paidPayments.length} confirmed payment{paidPayments.length === 1 ? "" : "s"} to date.</p></section>
    </div>
  </>
}

const TIME_BUCKETS = [
  { value: "morning", label: "Morning (before 12pm)", test: (hour: number) => hour < 12 },
  { value: "afternoon", label: "Afternoon (12pm-5pm)", test: (hour: number) => hour >= 12 && hour < 17 },
  { value: "evening", label: "Evening (after 5pm)", test: (hour: number) => hour >= 17 },
]
const PAY_BANDS = [
  { value: "under-500", label: "Under £500 / session", test: (minor: number) => minor < 50000 },
  { value: "500-750", label: "£500 - £750 / session", test: (minor: number) => minor >= 50000 && minor < 75000 },
  { value: "750-1000", label: "£750 - £1,000 / session", test: (minor: number) => minor >= 75000 && minor < 100000 },
  { value: "1000-plus", label: "£1,000+ / session", test: (minor: number) => minor >= 100000 },
]
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "pay-high", label: "Pay: high to low" },
  { value: "pay-low", label: "Pay: low to high" },
  { value: "closing-soon", label: "Closing soon" },
]
function londonHour(iso: string) { return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }).format(new Date(iso))) }
function londonDateKey(iso: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso)) }
// Every session in this app is scheduled in Europe/London wall-clock time regardless of which
// timezone the manager's own browser happens to be in. `new Date("2026-11-07T09:00")` parses that
// string using the BROWSER's local timezone, not London, so a manager whose OS clock isn't set to
// the UK silently publishes the wrong UTC instant. This converts a London wall-clock date+time into
// the correct UTC instant by measuring London's actual offset (including BST) at that moment.
function londonOffsetMinutes(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/London", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(instant).reduce((acc, part) => { acc[part.type] = part.value; return acc }, {} as Record<string, string>)
  const asIfUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), parts.hour === "24" ? 0 : Number(parts.hour), Number(parts.minute), Number(parts.second))
  return (asIfUtc - instant.getTime()) / 60000
}
function londonWallTimeToIso(dateKey: string, time: string) {
  const guess = new Date(`${dateKey}T${time}:00.000Z`)
  return new Date(guess.getTime() - londonOffsetMinutes(guess) * 60000).toISOString()
}

function FindWork({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) {
  const portalContainer = usePortalContainer()
  const opportunities = state.requirements.filter((item) => item.status === "published")
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [specialty, setSpecialty] = useState("")
  const [location, setLocation] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("")
  const [payBand, setPayBand] = useState("")
  const [vacancyType, setVacancyType] = useState("")
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const specialties = [...new Set(opportunities.map((item) => item.specialty))].sort()
  const locations = [...new Set(opportunities.map((item) => state.sites.find((site) => site.id === item.siteId)?.area).filter((value): value is string => Boolean(value)))].sort()
  const vacancyTypes = [...new Set(opportunities.map((item) => item.scope))].sort()
  const hasSessionFilter = Boolean(dateFilter || time || duration || availableOnly)

  function occurrenceMatches(occ: { startsAt: string; endsAt: string; capacity: number; reserved: number }) {
    if (dateFilter && londonDateKey(occ.startsAt) !== dateFilter) return false
    if (time) { const bucket = TIME_BUCKETS.find((item) => item.value === time); if (bucket && !bucket.test(londonHour(occ.startsAt))) return false }
    if (duration) { const hours = (new Date(occ.endsAt).getTime() - new Date(occ.startsAt).getTime()) / 3600000; if (duration === "half" && hours > 4) return false; if (duration === "full" && hours <= 4) return false }
    if (availableOnly && occ.reserved >= occ.capacity) return false
    return true
  }

  const results = opportunities
    .map((req) => {
      const site = state.sites.find((item) => item.id === req.siteId)
      const visibleOccurrenceIds = hasSessionFilter ? req.occurrenceIds.filter((id) => { const occ = state.occurrences.find((item) => item.id === id); return occ && occurrenceMatches(occ) }) : req.occurrenceIds
      return { req, site, visibleOccurrenceIds }
    })
    .filter(({ req, site, visibleOccurrenceIds }) => {
      if (specialty && req.specialty !== specialty) return false
      if (location && site?.area !== location) return false
      if (vacancyType && req.scope !== vacancyType) return false
      if (payBand) { const band = PAY_BANDS.find((item) => item.value === payBand); if (band && !band.test(req.rateMinor)) return false }
      return visibleOccurrenceIds.length > 0
    })
    .sort((a, b) => {
      if (sortBy === "oldest") return a.req.createdAt.localeCompare(b.req.createdAt)
      if (sortBy === "pay-high") return b.req.rateMinor - a.req.rateMinor
      if (sortBy === "pay-low") return a.req.rateMinor - b.req.rateMinor
      if (sortBy === "closing-soon") return a.req.deadline.localeCompare(b.req.deadline)
      return b.req.createdAt.localeCompare(a.req.createdAt)
    })

  const activeFilterCount = [specialty, location, dateFilter, time, duration, payBand, vacancyType, availableOnly ? "yes" : ""].filter(Boolean).length
  function clearFilters() { setSpecialty(""); setLocation(""); setDateFilter(""); setTime(""); setDuration(""); setPayBand(""); setVacancyType(""); setAvailableOnly(false) }
  const activeChips = [
    specialty && { key: "specialty", label: specialty, clear: () => setSpecialty("") },
    location && { key: "location", label: location, clear: () => setLocation("") },
    vacancyType && { key: "type", label: vacancyType, clear: () => setVacancyType("") },
    payBand && { key: "pay", label: PAY_BANDS.find((item) => item.value === payBand)?.label ?? "Pay", clear: () => setPayBand("") },
    dateFilter && { key: "date", label: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(dateFilter)), clear: () => setDateFilter("") },
    time && { key: "time", label: TIME_BUCKETS.find((item) => item.value === time)?.label ?? "Time", clear: () => setTime("") },
    duration && { key: "duration", label: duration === "half" ? "Half day" : "Full day", clear: () => setDuration("") },
    availableOnly && { key: "available", label: "Capacity available", clear: () => setAvailableOnly(false) },
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => Boolean(chip))

  return <>
    <PageTitle eyebrow="Opportunities" title="Find work" detail="Newest vacancies appear first. Select only the dates you can cover." />
    <div className="df-filter-summary">
      <button type="button" className="df-filter-trigger" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal size={15} />
        Filters
        {activeFilterCount > 0 && <i>{activeFilterCount}</i>}
      </button>
      {activeChips.length > 0 && <div className="df-filter-chips">{activeChips.map((chip) => <span className="df-filter-chip" key={chip.key}>{chip.label}<button type="button" aria-label={`Remove ${chip.label} filter`} onClick={chip.clear}><X size={12} /></button></span>)}</div>}
      <label className="df-filter-sort" htmlFor="sort-by"><span>Sort</span><select id="sort-by" name="sort-by" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>{SORT_OPTIONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      {activeFilterCount > 0 && <button type="button" className="df-text-button" onClick={clearFilters}>Clear all</button>}
    </div>
    <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
      <Dialog.Portal container={portalContainer}>
        <Dialog.Overlay className="df-dialog-overlay" />
        <Dialog.Content className="df-form-dialog df-filter-dialog">
          <Dialog.Title>Find matching requirements</Dialog.Title>
          <Dialog.Description>Narrow opportunities by specialty, location, pay and availability.</Dialog.Description>
          <Dialog.Close className="df-dialog-close" aria-label="Close filters"><X size={20} /></Dialog.Close>
          <div className="df-dialog-form df-filter-grid">
            <label htmlFor="filter-specialty">Specialty<select id="filter-specialty" name="filter-specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option value="">All specialties</option>{specialties.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label htmlFor="filter-location">Location<select id="filter-location" name="filter-location" value={location} onChange={(event) => setLocation(event.target.value)}><option value="">All locations</option>{locations.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label htmlFor="filter-type">Vacancy type<select id="filter-type" name="filter-type" value={vacancyType} onChange={(event) => setVacancyType(event.target.value)}><option value="">All types</option>{vacancyTypes.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label htmlFor="filter-pay">Pay range<select id="filter-pay" name="filter-pay" value={payBand} onChange={(event) => setPayBand(event.target.value)}><option value="">Any pay</option>{PAY_BANDS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
            <label htmlFor="filter-date">Date<input id="filter-date" name="filter-date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
            <label htmlFor="filter-time">Time of day<select id="filter-time" name="filter-time" value={time} onChange={(event) => setTime(event.target.value)}><option value="">Any time</option>{TIME_BUCKETS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
            <label htmlFor="filter-duration">Duration<select id="filter-duration" name="filter-duration" value={duration} onChange={(event) => setDuration(event.target.value)}><option value="">Any duration</option><option value="half">Half day (up to 4 hours)</option><option value="full">Full day (more than 4 hours)</option></select></label>
            <label className="df-checkbox-field" htmlFor="filter-available"><input id="filter-available" name="filter-available" type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />Only show sessions with capacity available</label>
          </div>
          <div className="df-filter-dialog-actions"><button type="button" className="df-text-button" disabled={!activeFilterCount} onClick={clearFilters}>Clear filters</button><button type="button" className="df-primary" onClick={() => setFiltersOpen(false)}>Show {results.length} result{results.length === 1 ? "" : "s"}</button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <div className="df-opportunities">
      {results.map(({ req, site, visibleOccurrenceIds }) => { const chosen = (selected[req.id] ?? []).filter((id) => visibleOccurrenceIds.includes(id)); const already = state.engagements.find((item) => item.requirementId === req.id && item.doctorId === actor.id); const deadlineUrgent = daysUntil(req.deadline) <= 2; return <article className={`df-panel df-opportunity${req.urgent || deadlineUrgent ? " is-urgent" : ""}`} key={req.id}><div><Status tone="info">{req.specialty}</Status>{req.urgent && <Status tone="danger"><AlertTriangle size={13} /> Urgent</Status>}<Urgency deadline={req.deadline} /><h2>{req.title}</h2><p>{site?.name} · {site?.area}</p></div><strong className="df-rate">{money(req.rateMinor)} <small>/ session</small></strong><p>{req.workload}. {req.support}.</p><fieldset><legend>Choose available dates</legend>{visibleOccurrenceIds.map((id) => { const occ = state.occurrences.find((item) => item.id === id); return <label key={id}><input type="checkbox" name={`occurrence-${id}`} checked={chosen.includes(id)} onChange={() => setSelected((current) => ({ ...current, [req.id]: chosen.includes(id) ? chosen.filter((value) => value !== id) : [...chosen, id] }))} /><span>{occ && date(occ.startsAt)}</span></label> })}</fieldset>{already ? <Link className="df-secondary" href={`/engagements/${already.id}`}>View {stage(already.stage)}</Link> : <button disabled={busy || !chosen.length} className="df-primary" type="button" onClick={() => command("apply", req.id, req.version, { occurrenceIds: chosen })}>Apply for {chosen.length || "selected"} date{chosen.length === 1 ? "" : "s"}</button>}</article> })}
      {!results.length && <Empty title={opportunities.length ? "No opportunities match your filters" : "No opportunities published yet"} detail={opportunities.length ? "Try widening your filters, such as specialty, location, pay range or availability." : "Published vacancies will appear here."} />}
    </div>
  </>
}

function Bookings({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) { const bookings = state.bookings.filter((item) => item.doctorId === actor.id); return <><PageTitle eyebrow="Schedule" title="Bookings" detail="Agreement and permission to work remain separate for every occurrence." />{bookings.length ? bookings.map((booking) => { const payment = state.payments.find((item) => item.bookingId === booking.id); const complete = booking.occurrenceIds.every((id) => state.occurrences.find((item) => item.id === id)?.state === "completed"); const hasDiscrepancy = booking.occurrenceIds.some((id) => state.occurrences.find((item) => item.id === id)?.state === "discrepancy"); return <section className={`df-panel df-booking-card${hasDiscrepancy ? " is-urgent" : complete ? " is-complete" : ""}`} key={booking.id}>{booking.occurrenceIds.map((id) => { const ready = calculateOccurrenceReadiness(state, actor.id, id); const occ = state.occurrences.find((item) => item.id === id); const canConfirm = Boolean(occ && (occ.state === "booked" || occ.state === "completed") && !occ.doctorConfirmedAt && new Date(occ.endsAt) <= new Date()); const confirmation = confirmationStatus(ready); return <div className="df-record" key={id}><div><strong>{occ && date(occ.startsAt)}</strong><span>Terms accepted · {occ && stage(occ.state)} · Europe/London{occ?.doctorConfirmedAt && occ.state !== "discrepancy" ? " · You confirmed attendance" : ""}</span></div><div className="df-record-actions"><Status tone={occ?.state === "discrepancy" ? "danger" : confirmation.tone}>{occ?.state === "discrepancy" ? "Discrepancy reported" : confirmation.label}</Status>{canConfirm && occ && <><button disabled={busy} className="df-secondary compact" type="button" onClick={() => command("confirm-attendance", id, occ.version, { outcome: "worked" })}>I worked this</button><button disabled={busy} className="df-text-button danger" type="button" onClick={() => command("confirm-attendance", id, occ.version, { outcome: "did_not_happen" })}>Report a problem</button></>}</div></div> })}<footer>{payment ? <Status tone={payment.state === "paid" ? "success" : payment.state === "discrepancy" ? "danger" : "info"}>Invoice: {stage(payment.state)}</Status> : complete ? <button disabled={busy} className="df-primary" type="button" onClick={() => command("submit-invoice", booking.id, booking.version, { invoiceReference: `DF-${booking.id.slice(-6).toUpperCase()}` })}>Submit invoice</button> : <span>Invoice becomes available after clinic-confirmed completion.</span>}</footer></section> }) : <Empty title="No accepted bookings yet" detail="An offer must be explicitly accepted before dates appear here." />}</> }

function DoctorEarnings({ state, actor }: { state: WorkspaceState; actor: WorkspaceUser }) {
  const bookingIds = new Set(state.bookings.filter((item) => item.doctorId === actor.id).map((item) => item.id))
  const payments = state.payments.filter((item) => bookingIds.has(item.bookingId)).toSorted((a, b) => (b.dueAt ?? "").localeCompare(a.dueAt ?? ""))
  const paid = payments.filter((item) => item.state === "paid")
  const totalPaidMinor = paid.reduce((sum, item) => sum + item.amountMinor, 0)
  const pendingMinor = payments.filter((item) => item.state !== "paid").reduce((sum, item) => sum + item.amountMinor, 0)
  const byOrganisation = new Map<string, { name: string; totalMinor: number; count: number }>()
  for (const payment of paid) {
    const booking = state.bookings.find((item) => item.id === payment.bookingId)
    const engagement = booking && state.engagements.find((item) => item.id === booking.engagementId)
    const requirement = engagement && state.requirements.find((item) => item.id === engagement.requirementId)
    const organisation = requirement && state.organisations.find((item) => item.id === requirement.organisationId)
    const key = organisation?.id ?? "unknown"
    const current = byOrganisation.get(key) ?? { name: organisation?.name ?? "Unknown organisation", totalMinor: 0, count: 0 }
    current.totalMinor += payment.amountMinor
    current.count += 1
    byOrganisation.set(key, current)
  }
  return <><PageTitle eyebrow="Earnings" title="Payment history" detail="Totals reflect payments your clinics have confirmed. Payment dates follow each clinic's own schedule." />
    <div className="df-grid-2">
      <section className="df-panel"><div className="df-section-head"><div><span>Confirmed</span><h2>{money(totalPaidMinor)}</h2></div></div><p>{paid.length} confirmed payment{paid.length === 1 ? "" : "s"}{pendingMinor ? ` · ${money(pendingMinor)} awaiting confirmation` : ""}</p></section>
      <section className="df-panel"><div className="df-section-head"><div><span>By organisation</span><h2>Where it came from</h2></div></div>{byOrganisation.size ? [...byOrganisation.values()].map((entry) => <div className="df-record" key={entry.name}><div><strong>{entry.name}</strong><span>{entry.count} payment{entry.count === 1 ? "" : "s"}</span></div><strong>{money(entry.totalMinor)}</strong></div>) : <Empty title="Nothing confirmed yet" detail="Confirmed payments will be grouped by organisation here." />}</section>
    </div>
    <section className="df-panel df-table-panel"><GroupHeader tone="green" title="Payment history" count={payments.length} /><table className="df-table df-responsive-table"><thead><tr><th>Reference</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td data-label="Reference">{payment.invoiceReference ?? payment.id}</td><td data-label="Amount">{money(payment.amountMinor)}</td><td data-label="Due">{payment.dueAt ? date(payment.dueAt) : "—"}</td><td data-label="Status"><Status tone={payment.state === "paid" ? "success" : payment.state === "discrepancy" ? "danger" : "info"}>{stage(payment.state)}</Status></td></tr>)}</tbody></table>{!payments.length && <Empty title="No payment history yet" detail="Payments appear here once a completed session's invoice is confirmed." />}</section>
  </>
}

function ClinicBookings({ state, actor, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) { const engagementIds = new Set(state.engagements.filter((eng) => state.requirements.find((req) => req.id === eng.requirementId)?.organisationId === actor.organisationId).map((eng) => eng.id)); const bookings = state.bookings.filter((item) => engagementIds.has(item.engagementId)); return <><PageTitle eyebrow="Clinic schedule" title="Bookings" detail="Accepted agreements with a separate operational readiness state." />{bookings.length ? <section className="df-panel">{bookings.flatMap((booking) => booking.occurrenceIds.map((id) => { const occurrence = state.occurrences.find((item) => item.id === id); const doctor = state.doctors.find((item) => item.id === booking.doctorId); const readiness = calculateOccurrenceReadiness(state, booking.doctorId, id); const disputed = occurrence?.state === "discrepancy"; const canComplete = (occurrence?.state === "booked" || disputed) && readiness.state === "ready" && new Date(occurrence.endsAt) <= new Date(); const confirmation = confirmationStatus(readiness); return <div className="df-record" key={id}><div><strong>{doctor?.name} · {occurrence && date(occurrence.startsAt)}</strong><span>Terms accepted · {occurrence && stage(occurrence.state)} · {occurrence?.doctorConfirmedAt ? `doctor confirmed ${date(occurrence.doctorConfirmedAt)}` : "readiness assessed independently"}</span></div><div className="df-record-actions">{disputed && <Status tone="danger">Discrepancy reported</Status>}<Status tone={confirmation.tone}>{confirmation.label}</Status>{canComplete && <button disabled={busy} className="df-secondary compact" type="button" onClick={() => command("mark-complete", id, occurrence.version)}>{disputed ? "Resolve as completed" : "Confirm completion"}</button>}</div></div> }))}</section> : <Empty title="No accepted bookings yet" detail="Accepted offers will appear here without hiding unresolved readiness checks." />}</> }

function InboxView({ state, actor, onOpenNotification }: { state: WorkspaceState; actor: WorkspaceUser; onOpenNotification: (notificationId: string, href: string) => void }) {
  const conversations = state.conversations.filter((item) => item.participantIds.includes(actor.id)).toSorted((a, b) => { const aTime = state.messages.filter((item) => item.conversationId === a.id).at(-1)?.sentAt ?? ""; const bTime = state.messages.filter((item) => item.conversationId === b.id).at(-1)?.sentAt ?? ""; return bTime.localeCompare(aTime) })
  const notifications = state.notifications.filter((item) => item.recipientId === actor.id).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  return <><PageTitle eyebrow="Communication centre" title="Inbox" detail={`${conversations.length} conversations and ${notifications.filter((item) => !item.readAt).length} unread updates.`} /><div className="df-inbox-layout"><section className="df-panel"><div className="df-section-head"><div><span>Messages</span><h2>Staffing conversations</h2></div></div>{conversations.map((conversation) => { const eng = state.engagements.find((item) => item.id === conversation.engagementId); const other = state.users.find((item) => conversation.participantIds.includes(item.id) && item.id !== actor.id); const latest = state.messages.filter((item) => item.conversationId === conversation.id).at(-1); const unread = state.messages.some((item) => item.conversationId === conversation.id && item.senderId !== actor.id && !item.seenBy[actor.id]); return <Link className={`df-record df-message-preview ${unread ? "unread" : ""}`} href={`/engagements/${eng?.id}`} key={conversation.id}><span className="df-avatar small">{other?.initials}</span><div><strong>{other?.name}{unread && <i>New</i>}</strong><span>{latest?.body ?? "No messages yet"}</span></div><time>{latest && date(latest.sentAt)}</time></Link> })}</section><aside className="df-panel df-notification-list"><div className="df-section-head"><div><span>Updates</span><h2>Activity requiring attention</h2></div></div>{notifications.map((item) => <Link className={`df-notification-item ${item.readAt ? "" : "unread"}`} href={item.href} key={item.id} onClick={(event) => { if (!item.readAt) { event.preventDefault(); onOpenNotification(item.id, item.href) } }}><span className={`df-notification-icon ${item.category}`}><Bell size={16} /></span><div><strong>{item.title}</strong><p>{item.detail}</p><time>{date(item.createdAt)}{item.readAt ? ` · Seen ${date(item.readAt)}` : " · Unread"}</time></div><ChevronRight size={17} /></Link>)}</aside></div></>
}

function TypingDots() {
  return <span className="df-typing-dots" aria-hidden="true"><i /><i /><i /></span>
}

function EngagementView({ state, actor, engagementId, onRefresh }: { state: WorkspaceState; actor: WorkspaceUser; engagementId: string; onRefresh: () => Promise<void> }) {
  const eng = state.engagements.find((item) => item.id === engagementId); const conversation = state.conversations.find((item) => item.engagementId === engagementId); const [body, setBody] = useState(""); const [price, setPrice] = useState(""); const [sending, setSending] = useState(false)
  const conversationId = conversation?.id
  const messages = state.messages.filter((item) => item.conversationId === conversationId)
  const [otherTyping, setOtherTyping] = useState(false)
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingActive = useRef(false)

  // No websockets in this prototype, so incoming messages and read receipts are
  // picked up by polling while the conversation is open -- each tick also marks
  // freshly-arrived messages seen, so the sender's "Seen" status updates live too.
  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    async function tick() {
      if (document.visibilityState === "hidden") return
      await fetch(`/api/v1/conversations/${conversationId}/seen`, { method: "POST" })
      if (!cancelled) await onRefresh()
    }
    void tick()
    const interval = setInterval(tick, 3000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [conversationId, onRefresh])

  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    async function poll() {
      const response = await fetch(`/api/v1/conversations/${conversationId}/typing`, { cache: "no-store" })
      if (cancelled || !response.ok) return
      const result = await response.json()
      if (!cancelled && result.success) setOtherTyping(result.data.typingUserIds.length > 0)
    }
    void poll()
    const interval = setInterval(poll, 1500)
    return () => { cancelled = true; clearInterval(interval) }
  }, [conversationId])

  function notifyTyping(typing: boolean) {
    if (!conversationId || typingActive.current === typing) return
    typingActive.current = typing
    void fetch(`/api/v1/conversations/${conversationId}/typing`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ typing }), keepalive: !typing })
  }

  useEffect(() => () => notifyTyping(false), [conversationId])

  if (!eng || !conversation || !conversation.participantIds.includes(actor.id)) return <Empty title="Record unavailable" detail="This engagement does not exist or is outside your authorised workspace." />
  const req = state.requirements.find((item) => item.id === eng.requirementId); const other = state.users.find((item) => conversation.participantIds.includes(item.id) && item.id !== actor.id)
  function handleBodyChange(value: string) {
    setBody(value)
    notifyTyping(value.trim().length > 0)
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current)
    typingStopTimer.current = setTimeout(() => notifyTyping(false), 2500)
  }
  async function send() {
    if (!body.trim()) return
    setSending(true)
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current)
    notifyTyping(false)
    const response = await fetch(`/api/v1/conversations/${conversationId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body, proposedRateMinor: price ? Number(price) * 100 : undefined }) })
    if (response.ok) { setBody(""); setPrice(""); await onRefresh() }
    setSending(false)
  }
  return <><PageTitle eyebrow={req?.title ?? "Engagement"} title={other?.name ?? "Conversation"} detail={`${stage(eng.stage)} · ${eng.selectedOccurrenceIds.length} selected date(s)`} /><section className="df-panel df-conversation-context"><div><span>Shared staffing journey</span><strong>{req?.title}</strong></div><EngagementLifecycle state={state} actor={actor} engagement={eng} /></section><section className="df-chat" aria-label="Conversation with composer"><header><div><span className="df-avatar small">{other?.initials}</span><div><strong>{other?.name}</strong><small>{otherTyping ? <span className="df-typing-status"><TypingDots /> typing…</span> : `${messages.length} message${messages.length === 1 ? "" : "s"} in this engagement`}</small></div></div><Status tone="success">Secure workspace</Status></header><div className="df-chat-messages" aria-label="Conversation messages" aria-live="polite">{messages.map((message) => { const mine = message.senderId === actor.id; const seen = Object.entries(message.seenBy).find(([id]) => id !== actor.id); return <div className={`df-bubble ${mine ? "mine" : ""}`} key={message.id}><span>{state.users.find((item) => item.id === message.senderId)?.name}</span><p>{message.body}</p>{message.proposedRateMinor && <div className="df-proposal"><CircleDollarSign size={17} /><div><strong>{money(message.proposedRateMinor)} per session</strong><small>Price proposal only. This is not an accepted offer.</small></div></div>}<small>{date(message.sentAt)}{mine && seen ? ` · Seen ${date(seen[1])}` : mine ? " · Delivered" : ""}</small></div> })}{otherTyping && <div className="df-bubble df-bubble-typing"><span>{other?.name}</span><TypingDots /></div>}</div><div className="df-chat-composer"><textarea name="message-body" aria-label="Message" value={body} onChange={(event) => handleBodyChange(event.target.value)} onBlur={() => notifyTyping(false)} placeholder="Write a clear staffing message" /><div className="df-chat-composer-row"><label className="df-chat-price">£<input name="message-proposed-rate" aria-label="Proposed price per session" inputMode="numeric" type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Optional rate" /></label><button disabled={sending || !body.trim()} className="df-primary" type="button" onClick={send}>{sending ? "Sending…" : "Send"}</button></div><small>Visible to the doctor and authorised clinic participants. Clinical evidence is shared separately.</small></div></section></>
}

function OfferView({ state, actor, offerId, busy, command }: { state: WorkspaceState; actor: WorkspaceUser; offerId: string; busy: boolean; command: (name: string, id: string, version: number) => Promise<unknown> }) {
  const offer = state.offers.find((item) => item.id === offerId); const eng = state.engagements.find((item) => item.id === offer?.engagementId); const req = state.requirements.find((item) => item.id === eng?.requirementId)
  if (!offer || !eng || !req || (actor.role === "doctor" ? eng.doctorId !== actor.id : actor.organisationId !== req.organisationId)) return <Empty title="Offer unavailable" detail="It may have changed or be outside your authorised workspace." />
  const readiness = calculateOccurrenceReadiness(state, eng.doctorId, offer.occurrenceIds[0])
  return <><PageTitle eyebrow={`${req.title} · Offer version ${offer.version}`} title="Review offer" detail="Reviewing this page does not accept the offer." /><section className="df-panel df-lifecycle-panel"><div className="df-section-head"><div><span>Shared progress</span><h2>From interest to payment</h2></div></div><EngagementLifecycle state={state} actor={actor} engagement={eng} /></section><div className="df-offer-layout"><section className="df-panel df-offer"><div className="df-offer-total"><div><span>Total for {offer.occurrenceIds.length} session(s)</span><strong>{money(offer.totalMinor)}</strong></div><Status tone={offer.status === "sent" ? "info" : offer.status === "accepted" ? "success" : "neutral"}>{stage(offer.status)}</Status></div><dl><div><dt>Scope</dt><dd>{offer.scope}</dd></div><div><dt>Payer</dt><dd>{offer.payer}</dd></div><div><dt>Session rate</dt><dd>{money(offer.rateMinor)}</dd></div><div><dt>Payment</dt><dd>{offer.paymentTerms}</dd></div><div><dt>Cancellation</dt><dd>{offer.cancellationTerms}</dd></div><div><dt>Expires</dt><dd>{date(offer.expiresAt)}</dd></div></dl><h2>Included occurrences</h2>{offer.occurrenceIds.map((id) => { const occ = state.occurrences.find((item) => item.id === id); return <div className="df-record" key={id}><CalendarDays size={18} /><div><strong>{occ && date(occ.startsAt)}</strong><span>Europe/London · {req.scope}</span></div></div> })}</section><aside className="df-panel df-decision"><h2>Decision</h2><p>Terms acceptance and readiness are deliberately separate.</p><Status tone={readiness.state === "ready" ? "success" : "warning"}>{stage(readiness.state)}</Status>{readiness.blockers.map((blocker) => <p className="df-blocker" key={blocker}>{blocker}</p>)}{actor.role === "doctor" && offer.status === "sent" ? <><button disabled={busy} className="df-primary" type="button" onClick={() => command("accept-offer", offer.id, offer.version)}>Accept displayed version</button><Link className="df-secondary" href={`/engagements/${eng.id}`}>Ask a question</Link><button disabled={busy} className="df-text-button danger" type="button" onClick={() => command("decline-offer", offer.id, offer.version)}>Decline offer</button></> : <p className="df-waiting">{actor.role === "doctor" ? "No decision is available for this version." : "Only the named doctor can accept this offer."}</p>}</aside></div></>
}

function ApproverView({ state, busy, command }: { state: WorkspaceState; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) { return <><PageTitle eyebrow="Clinical governance" title="My reviews" detail="Approval remains bound to doctor, site, scope, and validity period." /><section className="df-panel">{state.approvals.map((approval) => <div className="df-record" key={approval.id}><div><strong>{state.doctors.find((item) => item.id === approval.doctorId)?.name}</strong><span>{state.sites.find((item) => item.id === approval.siteId)?.name} · {approval.scope}</span></div><div className="df-record-actions"><Status tone={approval.status === "approved" ? "success" : "warning"}>{stage(approval.status)}</Status>{approval.status !== "approved" && <button disabled={busy} type="button" className="df-secondary compact" onClick={() => command("approve-scope", approval.id, approval.version, { rationale: "Evidence reviewed for the named site and scope" })}>Approve scope</button>}</div></div>)}</section></> }
function FinanceView({ state, busy, command }: { state: WorkspaceState; busy: boolean; command: (name: string, id: string, version: number, payload?: Record<string, unknown>) => Promise<unknown> }) { return <><PageTitle eyebrow="Finance" title="Reconciliation" detail="Completion, invoice submission, and payment confirmation remain separate events." /><section className="df-panel">{state.payments.length ? state.payments.map((payment) => <div className="df-record" key={payment.id}><div><strong>{money(payment.amountMinor)}</strong><span>{payment.invoiceReference ?? "Invoice not submitted"}</span></div><div className="df-record-actions"><Status tone={payment.state === "paid" ? "success" : payment.state === "discrepancy" ? "danger" : "info"}>{stage(payment.state)}</Status>{(payment.state === "due" || payment.state === "processing") && <button disabled={busy} className="df-secondary compact" type="button" onClick={() => command("confirm-payment", payment.id, payment.version)}>Confirm payment</button>}</div></div>) : <Empty title="Nothing ready to reconcile" detail="A completed session must be confirmed before an invoice becomes due." />}</section></> }
function OperationsView({ state }: { state: WorkspaceState }) { return <><PageTitle eyebrow="Operations" title="Cases and audit" detail="A factual history of material actions across the fictional workspace." /><section className="df-panel">{state.auditEvents.toReversed().map((event) => <div className="df-record" key={event.id}><div><strong>{stage(event.action)}</strong><span>{event.detail} · {date(event.at)}</span></div><Status>v{event.version}</Status></div>)}</section></> }

