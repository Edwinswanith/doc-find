"use client"

import { useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = { email?: string; password?: string }

export function LoginScreen() {
  const router = useRouter()
  const emailId = useId()
  const passwordId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState("")

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!email.trim()) errors.email = "Enter your email address."
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address."
    if (!password) errors.password = "Enter your password."
    return errors
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFormError("")
    const errors = validate()
    setFieldErrors(errors)
    if (errors.email) { emailRef.current?.focus(); return }
    if (errors.password) { passwordRef.current?.focus(); return }

    setSubmitting(true)
    try {
      const response = await fetch("/api/v1/prototype/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      })
      const result = await response.json()
      if (!result.success) {
        setFormError(result.error?.message || "Incorrect email or password. Please try again.")
        setSubmitting(false)
        passwordRef.current?.focus()
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
        <div className="df-auth-panel-inner">
          <h2>Welcome back</h2>
          <p>Log in to your Doc+Find account</p>

          {formError && <div className="df-auth-error-banner" role="alert"><AlertCircle size={17} /><span>{formError}</span></div>}

          <form className="df-auth-form" onSubmit={submit} noValidate style={formError ? { marginTop: 16 } : undefined}>
            <div className="df-auth-field">
              <label htmlFor={emailId}>Email address</label>
              <div className={`df-auth-input${fieldErrors.email ? " has-error" : ""}`}>
                <Mail size={18} aria-hidden="true" />
                <input
                  ref={emailRef}
                  id={emailId}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined })) }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
                />
              </div>
              {fieldErrors.email && <p className="df-auth-field-error" id={`${emailId}-error`}>{fieldErrors.email}</p>}
            </div>

            <div className="df-auth-field">
              <label htmlFor={passwordId}>Password</label>
              <div className={`df-auth-input${fieldErrors.password ? " has-error" : ""}`}>
                <Lock size={18} aria-hidden="true" />
                <input
                  ref={passwordRef}
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined })) }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p className="df-auth-field-error" id={`${passwordId}-error`}>{fieldErrors.password}</p>}
            </div>

            <div className="df-auth-row">
              <label className="df-auth-remember">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                Remember me
              </label>
              <button type="button" className="df-auth-forgot" onClick={() => setNotice("Password reset isn't available in this demo. Use the credentials provided by your administrator.")}>Forgot password?</button>
            </div>

            <button type="submit" className="df-auth-submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? <><span className="df-auth-spinner" aria-hidden="true" />Logging in…</> : <>Log in <ArrowRight size={18} /></>}
            </button>
          </form>

          {notice && <div className="df-auth-notice" style={{ marginTop: 16 }}><ShieldCheck size={16} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

          <div className="df-auth-divider"><span>or</span></div>

          <div className="df-auth-trust">
            <ShieldCheck size={20} />
            <p>Secure, reliable, and trusted by healthcare professionals and organisations.</p>
          </div>

          <p className="df-auth-signup">Don&apos;t have an account? <Link href="/signup">Sign up</Link></p>
        </div>
      </section>
    </div>
  )
}
