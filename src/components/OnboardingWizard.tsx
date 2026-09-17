"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Building2, Check, FileText, MapPin, Pencil, ShieldCheck, Stethoscope, Trash2, Upload, User } from "lucide-react"
import type { EvidenceRecord, WorkspaceState, WorkspaceUser } from "@/lib/workspace/types"

type Props = { state: WorkspaceState; actor: WorkspaceUser; audience: "doctor" | "clinic"; onRefresh: () => Promise<void> }
type Fields = Record<string, string>
type FieldErrors = Record<string, string>

const DOCTOR_STEPS = ["Personal details", "Professional profile", "Work preferences", "Documents", "Review"]
const CLINIC_STEPS = ["Organisation", "Contact", "Staffing setup", "Review"]

const SHIFT_TYPES = ["Morning", "Afternoon", "Evening", "Full day"]
const CONTACT_METHODS = [{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }, { value: "messages", label: "Messages" }]
const ORG_TYPES = ["Private clinic", "NHS trust", "Hospital group", "Diagnostic centre", "Other"]

const EVIDENCE_CATEGORIES: { key: EvidenceRecord["category"]; label: string; detail: string }[] = [
  { key: "identity", label: "Identity verification", detail: "A passport, driving licence or national ID." },
  { key: "registration", label: "Professional registration (GMC)", detail: "Evidence of your current medical registration." },
  { key: "indemnity", label: "Professional indemnity insurance", detail: "Your current indemnity or medical defence certificate." },
]

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className={error ? "df-field-has-error" : undefined}>{label}{children}{hint && !error && <small className="df-field-hint">{hint}</small>}{error && <span className="df-field-error">{error}</span>}</label>
}

export function OnboardingWizard({ state, actor, audience, onRefresh }: Props) {
  const router = useRouter()
  const existingDraft = state.onboardingDrafts.find((item) => item.userId === actor.id && item.audience === audience)
  const doctorProfile = state.doctors.find((item) => item.id === actor.id)
  const organisation = state.organisations.find((item) => item.id === actor.organisationId)
  const site = state.sites.find((item) => item.organisationId === actor.organisationId)
  const myEvidence = state.evidence.filter((item) => item.doctorId === actor.id)

  const [fields, setFields] = useState<Fields>(() => {
    const defaults: Fields = audience === "doctor" ? {
      phone: doctorProfile?.phone ?? "",
      baseArea: doctorProfile?.baseArea ?? "",
      photoUrl: doctorProfile?.photoUrl ?? "",
      specialty: doctorProfile?.specialty ?? "",
      grade: doctorProfile?.grade ?? "",
      registrationNumber: doctorProfile?.registrationNumber ?? "",
      yearsExperience: "",
      currentOrganisation: doctorProfile?.currentOrganisation ?? "",
      bio: doctorProfile?.bio ?? "",
      preferredLocations: (doctorProfile?.preferredLocations ?? []).join(", "),
      travelRadiusMiles: doctorProfile ? String(doctorProfile.travelRadiusMiles) : "",
      scopes: (doctorProfile?.scopes ?? []).join(", "),
      availabilityPattern: doctorProfile?.availabilityPattern ?? "",
      preferredShiftTypes: (doctorProfile?.preferredShiftTypes ?? []).join(", "),
      minimumRateMinor: doctorProfile?.minimumRateMinor ? String(doctorProfile.minimumRateMinor / 100) : doctorProfile?.expectedRateMinor ? String(doctorProfile.expectedRateMinor / 100) : "",
    } : {
      name: organisation?.name ?? "",
      type: organisation?.type ?? "",
      website: organisation?.website ?? "",
      orgPhone: organisation?.phone ?? "",
      orgEmail: organisation?.email ?? "",
      address: organisation?.address ?? "",
      city: organisation?.city ?? "",
      postcode: organisation?.postcode ?? "",
      jobTitle: actor.jobTitle ?? "",
      phone: actor.phone ?? "",
      commonSpecialties: (organisation?.commonSpecialties ?? []).join(", "),
      staffingNotes: organisation?.staffingNotes ?? "",
      mainSite: site?.name ?? "",
      preferredContactMethod: organisation?.preferredContactMethod ?? "",
    }
    return { ...defaults, ...(existingDraft?.fields ?? {}) }
  })
  const [version, setVersion] = useState(existingDraft?.version ?? 0)
  const [step, setStep] = useState(Math.min(existingDraft?.step ?? 1, audience === "doctor" ? DOCTOR_STEPS.length : CLINIC_STEPS.length))
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [stepErrors, setStepErrors] = useState<FieldErrors>({})
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState("")
  const [docBusy, setDocBusy] = useState<Record<string, boolean>>({})
  const [docErrors, setDocErrors] = useState<FieldErrors>({})
  const photoInputRef = useRef<HTMLInputElement>(null)

  const steps = audience === "doctor" ? DOCTOR_STEPS : CLINIC_STEPS
  const lastStep = steps.length

  function set(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }))
    setSavedNotice(false)
    if (stepErrors[key]) setStepErrors((current) => { const next = { ...current }; delete next[key]; return next })
  }

  async function saveDraft(nextStep: number) {
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch(`/api/v1/onboarding/${audience}`, { method: "PUT", headers: { "content-type": "application/json", "Expected-Version": String(version) }, body: JSON.stringify({ step: nextStep, fields }) })
      const result = await response.json()
      if (result.success) {
        setVersion(result.data.version)
        setStep(nextStep)
        setSavedNotice(true)
        await onRefresh()
        return true
      }
      if (result.error?.code === "VERSION_CONFLICT" && typeof result.error.currentVersion === "number") setVersion(result.error.currentVersion)
      setSaveError(result.error?.message || "This section could not be saved. Please try again.")
      return false
    } catch {
      setSaveError("We couldn't reach the server. Check your connection and try again.")
      return false
    } finally {
      setSaving(false)
    }
  }

  function validateStep(target: number): FieldErrors {
    const errors: FieldErrors = {}
    if (audience === "doctor" && target === 2 && !fields.specialty?.trim()) errors.specialty = "Add your specialty."
    if (audience === "doctor" && target === 1 && !fields.baseArea?.trim()) errors.baseArea = "Add your location."
    if (audience === "clinic" && target === 1) {
      if (!fields.name?.trim()) errors.name = "Add your organisation name."
      if (!fields.city?.trim()) errors.city = "Add your city."
    }
    return errors
  }

  async function goNext() {
    const errors = validateStep(step)
    if (Object.keys(errors).length) { setStepErrors(errors); return }
    if (step >= lastStep) return
    await saveDraft(step + 1)
  }

  async function goBack() {
    if (step <= 1) return
    await saveDraft(step - 1)
  }

  async function jumpTo(target: number) {
    await saveDraft(target)
  }

  async function complete() {
    let errors: FieldErrors = {}
    if (audience === "doctor") errors = { ...validateStep(1), ...validateStep(2) }
    else errors = validateStep(1)
    if (Object.keys(errors).length) {
      setStepErrors(errors)
      const firstBadStep = audience === "doctor" ? (errors.baseArea ? 1 : 2) : 1
      setStep(firstBadStep)
      return
    }
    setCompleting(true)
    setCompleteError("")
    try {
      const response = await fetch(`/api/v1/onboarding/${audience}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fields }) })
      const result = await response.json()
      if (!result.success) {
        setCompleteError(result.error?.message || "Your profile could not be completed. Please try again.")
        setCompleting(false)
        return
      }
      router.push(result.data.redirectTo)
      router.refresh()
    } catch {
      setCompleteError("We couldn't reach the server. Check your connection and try again.")
      setCompleting(false)
    }
  }

  async function uploadPhoto(file: File) {
    if (file.size > 1_500_000) { setDocErrors((current) => ({ ...current, photo: "Choose an image under 1.5MB." })); return }
    const dataUrl = await readFileAsDataUrl(file)
    setDocErrors((current) => { const next = { ...current }; delete next.photo; return next })
    set("photoUrl", dataUrl)
  }

  async function uploadDocument(category: EvidenceRecord["category"], file: File) {
    if (file.size > 2_000_000) { setDocErrors((current) => ({ ...current, [category]: "Choose a file under 2MB." })); return }
    setDocBusy((current) => ({ ...current, [category]: true }))
    setDocErrors((current) => { const next = { ...current }; delete next[category]; return next })
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const response = await fetch("/api/v1/onboarding/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category, fileName: file.name, fileType: file.type || "application/octet-stream", fileDataUrl: dataUrl }) })
      const result = await response.json()
      if (result.success) await onRefresh()
      else setDocErrors((current) => ({ ...current, [category]: result.error?.message || "This file could not be uploaded." }))
    } finally {
      setDocBusy((current) => ({ ...current, [category]: false }))
    }
  }

  async function removeDocument(category: EvidenceRecord["category"]) {
    setDocBusy((current) => ({ ...current, [category]: true }))
    try {
      const response = await fetch("/api/v1/onboarding/documents", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ category }) })
      const result = await response.json()
      if (result.success) await onRefresh()
      else setDocErrors((current) => ({ ...current, [category]: result.error?.message || "This document could not be removed." }))
    } finally {
      setDocBusy((current) => ({ ...current, [category]: false }))
    }
  }

  function statusTone(status?: EvidenceRecord["status"]) {
    if (status === "checked") return "success"
    if (status === "submitted" || status === "under_review") return "warning"
    if (status === "correction_required") return "danger"
    return "neutral"
  }
  function statusLabel(status?: EvidenceRecord["status"]) {
    if (status === "checked") return "Verified"
    if (status === "under_review" || status === "submitted") return "Pending review"
    if (status === "correction_required") return "Correction needed"
    return "Not started"
  }

  function renderDoctorStep() {
    if (step === 1) return <>
      <Field label="Phone number"><input name="phone" type="tel" value={fields.phone ?? ""} onChange={(event) => set("phone", event.target.value)} placeholder="+44 7700 900000" /></Field>
      <Field label="Location" error={stepErrors.baseArea}><input name="baseArea" value={fields.baseArea ?? ""} onChange={(event) => set("baseArea", event.target.value)} placeholder="London" /></Field>
      <Field label="Profile photo" hint="Optional. Shown to clinics reviewing your profile.">
        <div className="df-photo-upload">
          {fields.photoUrl ? <img src={fields.photoUrl} alt="" className="df-photo-preview" /> : <span className="df-photo-placeholder"><User size={22} /></span>}
          <div>
            <button type="button" className="df-secondary compact" onClick={() => photoInputRef.current?.click()}>{fields.photoUrl ? "Replace photo" : "Upload photo"}</button>
            {fields.photoUrl && <button type="button" className="df-text-button danger" onClick={() => set("photoUrl", "")}>Remove</button>}
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); event.target.value = "" }} />
        </div>
        {docErrors.photo && <span className="df-field-error">{docErrors.photo}</span>}
      </Field>
    </>
    if (step === 2) return <>
      <Field label="Specialty" error={stepErrors.specialty}><input name="specialty" value={fields.specialty ?? ""} onChange={(event) => set("specialty", event.target.value)} placeholder="Dermatology" /></Field>
      <Field label="Grade / role"><input name="grade" value={fields.grade ?? ""} onChange={(event) => set("grade", event.target.value)} placeholder="Consultant" /></Field>
      <Field label="Registration number (GMC)" hint="If you hold one."><input name="registrationNumber" value={fields.registrationNumber ?? ""} onChange={(event) => set("registrationNumber", event.target.value)} placeholder="7012345" /></Field>
      <Field label="Years of experience"><input name="yearsExperience" inputMode="numeric" value={fields.yearsExperience ?? ""} onChange={(event) => set("yearsExperience", event.target.value.replace(/[^0-9]/g, ""))} placeholder="12" /></Field>
      <Field label="Current organisation" hint="Optional."><input name="currentOrganisation" value={fields.currentOrganisation ?? ""} onChange={(event) => set("currentOrganisation", event.target.value)} placeholder="Harley Street Skin Centre" /></Field>
      <Field label="Short professional bio"><textarea name="bio" rows={3} value={fields.bio ?? ""} onChange={(event) => set("bio", event.target.value)} placeholder="A short summary clinics will see on your profile." /></Field>
    </>
    if (step === 3) return <>
      <Field label="Preferred locations" hint="Comma separated."><input name="preferredLocations" value={fields.preferredLocations ?? ""} onChange={(event) => set("preferredLocations", event.target.value)} placeholder="London, Marylebone" /></Field>
      <Field label="Travel distance (miles)"><input name="travelRadiusMiles" inputMode="numeric" value={fields.travelRadiusMiles ?? ""} onChange={(event) => set("travelRadiusMiles", event.target.value.replace(/[^0-9]/g, ""))} placeholder="10" /></Field>
      <Field label="Preferred specialties / work type" hint="Comma separated."><input name="scopes" value={fields.scopes ?? ""} onChange={(event) => set("scopes", event.target.value)} placeholder="Adult general dermatology, Outpatient consultations" /></Field>
      <Field label="Available dates" hint="Describe your general pattern; specific dates are chosen per vacancy."><input name="availabilityPattern" value={fields.availabilityPattern ?? ""} onChange={(event) => set("availabilityPattern", event.target.value)} placeholder="Tuesdays and alternate Saturdays" /></Field>
      <fieldset className="df-shift-fieldset">
        <legend>Preferred shift types</legend>
        <div className="df-shift-options">{SHIFT_TYPES.map((shift) => { const list = (fields.preferredShiftTypes ?? "").split(",").map((item) => item.trim()).filter(Boolean); const checked = list.includes(shift); return <label key={shift} className={`df-shift-chip${checked ? " selected" : ""}`}><input type="checkbox" checked={checked} onChange={() => set("preferredShiftTypes", (checked ? list.filter((item) => item !== shift) : [...list, shift]).join(", "))} />{shift}</label> })}</div>
      </fieldset>
      <Field label="Minimum acceptable rate" hint="Per session, in GBP."><div className="df-money-input"><span>£</span><input name="minimumRateMinor" inputMode="numeric" value={fields.minimumRateMinor ?? ""} onChange={(event) => set("minimumRateMinor", event.target.value.replace(/[^0-9]/g, ""))} placeholder="500" /></div></Field>
    </>
    if (step === 4) return <>
      <p className="df-step-intro">There&apos;s no automated verification in this prototype. Uploaded documents move to <strong>Pending review</strong> until a reviewer checks them.</p>
      {EVIDENCE_CATEGORIES.map((category) => {
        const record = myEvidence.find((item) => item.category === category.key)
        const busy = Boolean(docBusy[category.key])
        return <div className="df-document-card" key={category.key}>
          <div className="df-document-card-head">
            <div><strong>{category.label}</strong><span>{category.detail}</span></div>
            <span className={`df-status ${statusTone(record?.status)}`}>{statusLabel(record?.status)}</span>
          </div>
          {record?.fileName && <div className="df-document-file"><FileText size={16} /><span>{record.fileName}</span>{record.fileDataUrl && <a href={record.fileDataUrl} target="_blank" rel="noreferrer" download={record.fileName}>View</a>}</div>}
          <div className="df-document-card-actions">
            <label className="df-secondary compact df-file-trigger">{busy ? "Uploading…" : record ? "Replace" : "Upload"}<Upload size={14} /><input type="file" accept="image/*,application/pdf" hidden disabled={busy || record?.status === "checked"} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDocument(category.key, file); event.target.value = "" }} /></label>
            {record && record.status !== "checked" && <button type="button" className="df-text-button danger" disabled={busy} onClick={() => void removeDocument(category.key)}><Trash2 size={14} /> Remove</button>}
          </div>
          {docErrors[category.key] && <span className="df-field-error">{docErrors[category.key]}</span>}
        </div>
      })}
    </>
    return renderDoctorReview()
  }

  function renderDoctorReview() {
    const shiftList = (fields.preferredShiftTypes ?? "").split(",").map((item) => item.trim()).filter(Boolean)
    return <div className="df-review-sections">
      <ReviewSection icon={User} title="Personal information" onEdit={() => jumpTo(1)}>
        <ReviewRow label="Phone" value={fields.phone} />
        <ReviewRow label="Location" value={fields.baseArea} />
      </ReviewSection>
      <ReviewSection icon={Stethoscope} title="Professional information" onEdit={() => jumpTo(2)}>
        <ReviewRow label="Specialty" value={fields.specialty} />
        <ReviewRow label="Grade" value={fields.grade} />
        <ReviewRow label="Registration number" value={fields.registrationNumber} />
        <ReviewRow label="Experience" value={fields.yearsExperience ? `${fields.yearsExperience} years` : ""} />
        <ReviewRow label="Current organisation" value={fields.currentOrganisation} />
        <ReviewRow label="Bio" value={fields.bio} />
      </ReviewSection>
      <ReviewSection icon={MapPin} title="Preferences" onEdit={() => jumpTo(3)}>
        <ReviewRow label="Preferred locations" value={fields.preferredLocations} />
        <ReviewRow label="Travel distance" value={fields.travelRadiusMiles ? `${fields.travelRadiusMiles} miles` : ""} />
        <ReviewRow label="Preferred work" value={fields.scopes} />
        <ReviewRow label="Availability" value={fields.availabilityPattern} />
        <ReviewRow label="Shift types" value={shiftList.join(", ")} />
        <ReviewRow label="Minimum rate" value={fields.minimumRateMinor ? `£${fields.minimumRateMinor} / session` : ""} />
      </ReviewSection>
      <ReviewSection icon={FileText} title="Documents" onEdit={() => jumpTo(4)}>
        {EVIDENCE_CATEGORIES.map((category) => <ReviewRow key={category.key} label={category.label} value={statusLabel(myEvidence.find((item) => item.category === category.key)?.status)} />)}
      </ReviewSection>
    </div>
  }

  function renderClinicStep() {
    if (step === 1) return <>
      <Field label="Clinic / hospital name" error={stepErrors.name}><input name="name" value={fields.name ?? ""} onChange={(event) => set("name", event.target.value)} placeholder="Harley Street Skin Centre" /></Field>
      <Field label="Organisation type"><select name="type" value={fields.type ?? ""} onChange={(event) => set("type", event.target.value)}><option value="">Select a type</option>{ORG_TYPES.map((item) => <option value={item} key={item}>{item}</option>)}</select></Field>
      <Field label="Website" hint="Optional."><input name="website" type="url" value={fields.website ?? ""} onChange={(event) => set("website", event.target.value)} placeholder="https://" /></Field>
      <Field label="Main phone number"><input name="orgPhone" type="tel" value={fields.orgPhone ?? ""} onChange={(event) => set("orgPhone", event.target.value)} placeholder="+44 20 7000 0000" /></Field>
      <Field label="Main email"><input name="orgEmail" type="email" value={fields.orgEmail ?? ""} onChange={(event) => set("orgEmail", event.target.value)} placeholder="hello@clinic.example" /></Field>
      <Field label="Address"><input name="address" value={fields.address ?? ""} onChange={(event) => set("address", event.target.value)} placeholder="1 Harley Street" /></Field>
      <div className="df-form-row">
        <Field label="City" error={stepErrors.city}><input name="city" value={fields.city ?? ""} onChange={(event) => set("city", event.target.value)} placeholder="London" /></Field>
        <Field label="Postcode" hint="Optional."><input name="postcode" value={fields.postcode ?? ""} onChange={(event) => set("postcode", event.target.value)} placeholder="W1G 9QD" /></Field>
      </div>
    </>
    if (step === 2) return <>
      <Field label="Name"><input value={actor.name} disabled /></Field>
      <Field label="Job title / role"><input name="jobTitle" value={fields.jobTitle ?? ""} onChange={(event) => set("jobTitle", event.target.value)} placeholder="Clinic manager" /></Field>
      <Field label="Phone number"><input name="phone" type="tel" value={fields.phone ?? ""} onChange={(event) => set("phone", event.target.value)} placeholder="+44 7700 900000" /></Field>
      <div className="df-dialog-note"><ShieldCheck size={17} /><span>You&apos;ll be the initial administrator for this organisation.</span></div>
    </>
    if (step === 3) return <>
      <Field label="Specialties commonly hired" hint="Comma separated."><input name="commonSpecialties" value={fields.commonSpecialties ?? ""} onChange={(event) => set("commonSpecialties", event.target.value)} placeholder="Dermatology, Minor surgery" /></Field>
      <Field label="Typical staffing needs"><textarea name="staffingNotes" rows={3} value={fields.staffingNotes ?? ""} onChange={(event) => set("staffingNotes", event.target.value)} placeholder="A short description of the cover you usually need." /></Field>
      <Field label="Main work location / site"><input name="mainSite" value={fields.mainSite ?? ""} onChange={(event) => set("mainSite", event.target.value)} placeholder="Harley Street" /></Field>
      <Field label="Preferred contact method"><select name="preferredContactMethod" value={fields.preferredContactMethod ?? ""} onChange={(event) => set("preferredContactMethod", event.target.value)}><option value="">Select a method</option>{CONTACT_METHODS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></Field>
      <div className="df-dialog-note"><Briefcase size={17} /><span>You can post your first vacancy any time after setup -- it isn&apos;t required to finish here.</span></div>
    </>
    return renderClinicReview()
  }

  function renderClinicReview() {
    return <div className="df-review-sections">
      <ReviewSection icon={Building2} title="Organisation details" onEdit={() => jumpTo(1)}>
        <ReviewRow label="Name" value={fields.name} />
        <ReviewRow label="Type" value={fields.type} />
        <ReviewRow label="Website" value={fields.website} />
        <ReviewRow label="Phone" value={fields.orgPhone} />
        <ReviewRow label="Email" value={fields.orgEmail} />
        <ReviewRow label="Address" value={[fields.address, fields.city, fields.postcode].filter(Boolean).join(", ")} />
      </ReviewSection>
      <ReviewSection icon={User} title="Manager details" onEdit={() => jumpTo(2)}>
        <ReviewRow label="Name" value={actor.name} />
        <ReviewRow label="Job title" value={fields.jobTitle} />
        <ReviewRow label="Phone" value={fields.phone} />
      </ReviewSection>
      <ReviewSection icon={Briefcase} title="Staffing preferences" onEdit={() => jumpTo(3)}>
        <ReviewRow label="Specialties" value={fields.commonSpecialties} />
        <ReviewRow label="Typical needs" value={fields.staffingNotes} />
        <ReviewRow label="Main site" value={fields.mainSite} />
        <ReviewRow label="Preferred contact" value={CONTACT_METHODS.find((item) => item.value === fields.preferredContactMethod)?.label} />
      </ReviewSection>
    </div>
  }

  const isReviewStep = step === lastStep
  const isDoctor = audience === "doctor"

  return <>
    <div className="df-page-title"><div className="df-title-cluster"><span className="df-page-icon" aria-hidden="true">{isDoctor ? <Stethoscope size={20} /> : <Building2 size={20} />}</span><div><span className="df-eyebrow">{isDoctor ? "Doctor onboarding" : "Clinic onboarding"}</span><h1>{isDoctor ? "Complete your professional profile" : "Set up your clinic account"}</h1><p>{isDoctor ? "This takes about five minutes. You can save and finish later." : "This takes about five minutes. You can save and finish later."}</p></div></div></div>
    <div className="df-onboarding-layout">
      <aside className="df-panel df-onboarding-steps">
        <div><strong>{Math.round((step / lastStep) * 100)}%</strong><span>Setup progress</span></div>
        <ol>{steps.map((label, index) => <li className={index + 1 < step ? "complete" : index + 1 === step ? "current" : ""} key={label}><span>{index + 1 < step ? <Check size={13} /> : index + 1}</span><button type="button" onClick={() => void jumpTo(index + 1)}>{label}</button></li>)}</ol>
      </aside>
      <section className="df-panel df-form">
        <div className="df-progress"><span style={{ width: `${Math.min(100, (step / lastStep) * 100)}%` }} /></div>
        <div className="df-form-status"><span className="df-status neutral">Step {step} of {lastStep}</span><span>{steps[step - 1]}</span></div>
        {isReviewStep ? <h2 className="df-review-heading">Review your {isDoctor ? "profile" : "organisation"}</h2> : null}
        <div className="df-dialog-form">{isDoctor ? renderDoctorStep() : renderClinicStep()}</div>
        {!isReviewStep && <div className="df-dialog-note"><ShieldCheck size={17} /><span>Profile completeness, evidence checks and readiness are recorded separately.</span></div>}
        {saveError && <p className="df-field-error df-form-error">{saveError}</p>}
        {completeError && <p className="df-field-error df-form-error">{completeError}</p>}
        <div className="df-form-actions">
          {step > 1 && <button type="button" className="df-secondary" disabled={saving} onClick={() => void goBack()}>Back</button>}
          <button type="button" className="df-secondary" disabled={saving} onClick={() => void saveDraft(step)}>{saving ? "Saving…" : savedNotice ? "Saved" : "Save and continue later"}</button>
          {isReviewStep ? <button type="button" className="df-primary" disabled={completing} onClick={() => void complete()}>{completing ? "Completing…" : isDoctor ? "Complete Doctor Profile" : "Create Clinic Account"}</button>
            : <button type="button" className="df-primary" disabled={saving} onClick={() => void goNext()}>Save and next step</button>}
        </div>
      </section>
    </div>
  </>
}

function ReviewSection({ icon: Icon, title, onEdit, children }: { icon: typeof User; title: string; onEdit: () => void; children: React.ReactNode }) {
  return <div className="df-review-section">
    <div className="df-review-section-head"><span><Icon size={16} />{title}</span><button type="button" className="df-text-button" onClick={onEdit}><Pencil size={13} /> Edit</button></div>
    <dl>{children}</dl>
  </div>
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return <div><dt>{label}</dt><dd>{value?.trim() ? value : <span className="df-review-empty">Not provided</span>}</dd></div>
}
