"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AlertCircle, ArrowRight, Building2, Check, Stethoscope } from "lucide-react"

type Role = "doctor" | "manager"

const OPTIONS: { role: Role; icon: typeof Stethoscope; title: string; description: string }[] = [
  { role: "doctor", icon: Stethoscope, title: "I'm a Doctor", description: "Find opportunities, manage bookings, complete onboarding requirements and track your work." },
  { role: "manager", icon: Building2, title: "I'm representing a Clinic / Hospital", description: "Post staffing requirements, find doctors, manage bookings and track staffing." },
]

export function RoleSelectionScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState<Role | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  async function submit() {
    if (!selected || submitting) return
    setSubmitting(true)
    setFormError("")
    try {
      const response = await fetch("/api/v1/auth/select-role", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: selected }) })
      const result = await response.json()
      if (!result.success) {
        setFormError(result.error?.message || "Your account role could not be set. Please try again.")
        setSubmitting(false)
        return
      }
      router.push(result.data.redirectTo)
      router.refresh()
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  return (
    <div className="df-auth" data-ui="sapphire-workspace">
      <header className="df-auth-hero">
        <div className="df-auth-hero-image" aria-hidden="true">
          <Image src="/images/login-healthcare-hero.png" alt="" fill priority sizes="(min-width: 900px) 54vw, 100vw" />
        </div>
        <div className="df-auth-hero-content">
          <div className="df-auth-brand">Doc<b>+</b>Find</div>
          <p className="df-auth-tagline">Connecting Healthcare.<br />Empowering People.</p>
          <h1 className="df-auth-headline">The right people.<br />The right care.<br />At the right time.</h1>
          <p className="df-auth-subcopy">Doc+Find brings together doctors and healthcare organisations to make staffing simpler, faster, and more effective.</p>
        </div>
      </header>

      <section className="df-auth-panel">
        <div className="df-auth-panel-inner df-role-panel">
          <h2>How will you use Doc+Find?</h2>
          <p>Choose the option that fits you. This can&apos;t be changed later.</p>

          {formError && <div className="df-auth-error-banner" role="alert"><AlertCircle size={17} /><span>{formError}</span></div>}

          <div className="df-role-options" role="radiogroup" aria-label="Account type" style={formError ? { marginTop: 16 } : undefined}>
            {OPTIONS.map((option) => (
              <button
                type="button"
                key={option.role}
                role="radio"
                aria-checked={selected === option.role}
                className={`df-role-card${selected === option.role ? " selected" : ""}`}
                onClick={() => setSelected(option.role)}
              >
                <span className="df-role-card-icon"><option.icon size={22} /></span>
                <span className="df-role-card-copy">
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </span>
                <span className="df-role-card-check" aria-hidden="true">{selected === option.role && <Check size={14} />}</span>
              </button>
            ))}
          </div>

          <button type="button" className="df-auth-submit" disabled={!selected || submitting} aria-busy={submitting} onClick={submit} style={{ marginTop: 24 }}>
            {submitting ? <><span className="df-auth-spinner" aria-hidden="true" />Setting up your account…</> : <>Continue <ArrowRight size={18} /></>}
          </button>
        </div>
      </section>
    </div>
  )
}
