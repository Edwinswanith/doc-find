import { cookies } from "next/headers"
import { COOKIE_NAME, readPrototypeCookie, verifyPrototypeCookie } from "@/lib/prototype-session"
import { getWorkspaceState } from "@/lib/workspace/store"
import { authorisedWorkspaceState, canOpenWorkspaceView } from "@/lib/workspace/policy"
import { SapphireWorkspace } from "./SapphireWorkspace"
import { redirect } from "next/navigation"

export async function SapphireWorkspacePage({ view, recordId, organisationId }: { view: string; recordId?: string; organisationId?: string }) {
  const cookieValue = (await cookies()).get(COOKIE_NAME)?.value
  const verifiedActor = verifyPrototypeCookie(cookieValue)
  const actor = readPrototypeCookie(cookieValue)
  if (!canOpenWorkspaceView(actor, view, organisationId)) {
    if (actor.role === "manager") redirect(`/clinic/${actor.organisationId}/today`)
    if (actor.role === "doctor") redirect("/doctor/today")
    redirect(actor.role === "approver" ? "/approver/reviews" : actor.role === "finance" ? "/finance/reconciliation" : "/operations/cases")
  }
  const state = await getWorkspaceState()
  return <SapphireWorkspace initialActorId={actor.id} initialState={authorisedWorkspaceState(state, actor)} initialSessionReady={Boolean(verifiedActor)} view={view} recordId={recordId} />
}
