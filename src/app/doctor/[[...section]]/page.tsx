import { notFound } from "next/navigation"
import { SapphireWorkspacePage } from "@/components/SapphireWorkspacePage"

export default async function DoctorRoute({ params }: { params: Promise<{ section?: string[] }> }) {
  const key = (await params).section?.join("/") ?? "today"
  const views: Record<string, string> = { today: "doctor-today", "find-work": "doctor-find-work", bookings: "doctor-bookings", inbox: "inbox" }
  if (!views[key]) notFound()
  return <SapphireWorkspacePage view={views[key]} />
}
