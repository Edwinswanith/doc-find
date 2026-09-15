import { notFound } from "next/navigation"
import { SapphireWorkspacePage } from "@/components/SapphireWorkspacePage"

export default async function ClinicRoute({ params }: { params: Promise<{ organisationId: string; section?: string[] }> }) {
  const { organisationId, section = ["today"] } = await params
  const key = section.join("/")
  const views: Record<string, string> = { today: "clinic-today", "hiring/vacancies": "clinic-vacancies", "hiring/candidates": "clinic-candidates", "hiring/offers": "clinic-offers", doctors: "clinic-doctors", bookings: "clinic-bookings", inbox: "clinic-inbox" }
  if (!views[key]) notFound()
  return <SapphireWorkspacePage view={views[key]} organisationId={organisationId} />
}
