"use client"

import { useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { AlertCircle, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, User, X } from "lucide-react"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = { firstName?: string; lastName?: string; email?: string; password?: string; confirmPassword?: string; terms?: string }

const PASSWORD_RULES: { key: string; label: string; test: (value: string) => boolean }[] = [
  { key: "length", label: "At least 8 characters", test: (value) => value.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { key: "lower", label: "One lowercase letter", test: (value) => /[a-z]/.test(value) },
  { key: "number", label: "One number", test: (value) => /[0-9]/.test(value) },
]

export function SignUpScreen() {
  const router = useRouter()
  const firstNameId = useId()
  const lastNameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const confirmPasswordId = useId()
  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  function clearError(field: keyof FieldErrors) {
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!firstName.trim()) errors.firstName = "Enter your first name."
    if (!lastName.trim()) errors.lastName = "Enter your last name."
    if (!email.trim()) errors.email = "Enter your email address."
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address."
    const outstanding = PASSWORD_RULES.filter((rule) => !rule.test(password))
    if (!password) errors.password = "Create a password."
    else if (outstanding.length) errors.password = `Password needs: ${outstanding.map((rule) => rule.label.toLowerCase()).join(", ")}.`
    if (!confirmPassword) errors.confirmPassword = "Confirm your password."
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match."
    if (!termsAccepted) errors.terms = "Accept the Terms and Privacy Policy to continue."
    return errors
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setFormError("")
    const errors = validate()
    setFieldErrors(errors)
    if (errors.firstName) { firstNameRef.current?.focus(); return }
    if (errors.lastName) { lastNameRef.current?.focus(); return }
    if (errors.email) { emailRef.current?.focus(); return }
    if (errors.password) { passwordRef.current?.focus(); return }
    if (errors.confirmPassword) { confirmPasswordRef.current?.focus(); return }
    if (errors.terms) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, termsAccepted }),
      })
      const result = await response.json()
      if (!result.success) {
        const apiFieldErrors = result.error?.fieldErrors as Record<string, string[]> | undefined
        if (apiFieldErrors) {
          setFieldErrors({
            firstName: apiFieldErrors.firstName?.[0],
            lastName: apiFieldErrors.lastName?.[0],
            email: apiFieldErrors.email?.[0],
            password: apiFieldErrors.password?.[0],
            terms: apiFieldErrors.termsAccepted?.[0],
          })
        }
        setFormError(result.error?.message || "Your account could not be created. Please try again.")
        setSubmitting(false)
        if (result.error?.code === "EMAIL_TAKEN") emailRef.current?.focus()
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
          <h2>Create your account</h2>
          <p>Join Doc+Find to find work or find doctors</p>

          {formError && <div className="df-auth-error-banner" role="alert"><AlertCircle size={17} /><span>{formError}</span></div>}

          <form className="df-auth-form" onSubmit={submit} noValidate style={formError ? { marginTop: 16 } : undefined}>
            <div className="df-auth-name-row">
              <div className="df-auth-field">
                <label htmlFor={firstNameId}>First name</label>
                <div className={`df-auth-input${fieldErrors.firstName ? " has-error" : ""}`}>
                  <User size={18} aria-hidden="true" />
                  <input ref={firstNameRef} id={firstNameId} name="firstName" type="text" autoComplete="given-name" placeholder="Anika" value={firstName} onChange={(event) => { setFirstName(event.target.value); clearError("firstName") }} aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={fieldErrors.firstName ? `${firstNameId}-error` : undefined} />
                </div>
                {fieldErrors.firstName && <p className="df-auth-field-error" id={`${firstNameId}-error`}>{fieldErrors.firstName}</p>}
              </div>
              <div className="df-auth-field">
                <label htmlFor={lastNameId}>Last name</label>
                <div className={`df-auth-input${fieldErrors.lastName ? " has-error" : ""}`}>
                  <User size={18} aria-hidden="true" />
                  <input ref={lastNameRef} id={lastNameId} name="lastName" type="text" autoComplete="family-name" placeholder="Rao" value={lastName} onChange={(event) => { setLastName(event.target.value); clearError("lastName") }} aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={fieldErrors.lastName ? `${lastNameId}-error` : undefined} />
                </div>
                {fieldErrors.lastName && <p className="df-auth-field-error" id={`${lastNameId}-error`}>{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="df-auth-field">
              <label htmlFor={emailId}>Email address</label>
              <div className={`df-auth-input${fieldErrors.email ? " has-error" : ""}`}>
                <Mail size={18} aria-hidden="true" />
                <input ref={emailRef} id={emailId} name="email" type="email" inputMode="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); clearError("email") }} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined} />
              </div>
              {fieldErrors.email && <p className="df-auth-field-error" id={`${emailId}-error`}>{fieldErrors.email}</p>}
            </div>

            <div className="df-auth-field">
              <label htmlFor={passwordId}>Password</label>
              <div className={`df-auth-input${fieldErrors.password ? " has-error" : ""}`}>
                <Lock size={18} aria-hidden="true" />
                <input ref={passwordRef} id={passwordId} name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={password} onChange={(event) => { setPassword(event.target.value); setPasswordTouched(true); clearError("password") }} onFocus={() => setPasswordTouched(true)} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={`${passwordId}-requirements${fieldErrors.password ? ` ${passwordId}-error` : ""}`} />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <p className="df-auth-field-error" id={`${passwordId}-error`}>{fieldErrors.password}</p>}
              {passwordTouched && (
                <ul className="df-password-requirements" id={`${passwordId}-requirements`}>
                  {PASSWORD_RULES.map((rule) => { const met = rule.test(password); return <li key={rule.key} className={met ? "met" : ""}>{met ? <Check size={13} /> : <X size={13} />}{rule.label}</li> })}
                </ul>
              )}
            </div>

            <div className="df-auth-field">
              <label htmlFor={confirmPasswordId}>Confirm password</label>
              <div className={`df-auth-input${fieldErrors.confirmPassword ? " has-error" : ""}`}>
                <Lock size={18} aria-hidden="true" />
                <input ref={confirmPasswordRef} id={confirmPasswordId} name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearError("confirmPassword") }} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={fieldErrors.confirmPassword ? `${confirmPasswordId}-error` : undefined} />
                <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} aria-pressed={showConfirmPassword}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="df-auth-field-error" id={`${confirmPasswordId}-error`}>{fieldErrors.confirmPassword}</p>}
            </div>

            <div className="df-auth-field">
              <label className="df-auth-remember">
                <input type="checkbox" checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); clearError("terms") }} aria-invalid={Boolean(fieldErrors.terms)} aria-describedby={fieldErrors.terms ? "terms-error" : undefined} />
                I agree to the Terms of Service and Privacy Policy
              </label>
              {fieldErrors.terms && <p className="df-auth-field-error" id="terms-error">{fieldErrors.terms}</p>}
            </div>

            <button type="submit" className="df-auth-submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? <><span className="df-auth-spinner" aria-hidden="true" />Creating account…</> : "Create account"}
            </button>
          </form>

          <div className="df-auth-divider"><span>or</span></div>

          <div className="df-auth-trust">
            <ShieldCheck size={20} />
            <p>Secure, reliable, and trusted by healthcare professionals and organisations.</p>
          </div>

          <p className="df-auth-signup">Already have an account? <Link href="/login">Log in</Link></p>
        </div>
      </section>
    </div>
  )
}
