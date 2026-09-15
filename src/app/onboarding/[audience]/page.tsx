import { notFound } from "next/navigation"
import { SapphireWorkspacePage } from "@/components/SapphireWorkspacePage"
export default async function OnboardingPage({ params }: { params: Promise<{ audience: string }> }) { const { audience } = await params; if (audience !== "doctor" && audience !== "clinic") notFound(); return <SapphireWorkspacePage view="onboarding" recordId={audience} /> }
