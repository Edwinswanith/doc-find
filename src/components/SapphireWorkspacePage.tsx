import { cookies } from "next/headers"
import { COOKIE_NAME, defaultRouteForUser, verifyPrototypeCookie } from "@/lib/prototype-session"
import { getWorkspaceState } from "@/lib/workspace/store"
import { authorisedWorkspaceState, canOpenWorkspaceView } from "@/lib/workspace/policy"
import { SapphireWorkspace } from "./SapphireWorkspace"
import { redirect } from "next/navigation"

export async function SapphireWorkspacePage({ view, recordId, organisationId }: { view: string; recordId?: string; organisationId?: string }) {
  const cookieValue = (await cookies()).get(COOKIE_NAME)?.value
  const actor = await verifyPrototypeCookie(cookieValue)
  if (!actor) redirect("/login")
  // An account that hasn't finished its role-specific wizard can only ever land back on its own
  // onboarding route -- this is what stops a partially onboarded user from reaching the full
  // dashboard by navigating there directly, not just by following the post-login redirect.
  if (actor.accountStatus && actor.accountStatus !== "active" && view !== "onboarding") redirect(defaultRouteForUser(actor))
  if (!canOpenWorkspaceView(actor, view, organisationId, recordId)) redirect(defaultRouteForUser(actor))
  const state = await getWorkspaceState()
  return <SapphireWorkspace initialActorId={actor.id} initialState={authorisedWorkspaceState(state, actor)} view={view} recordId={recordId} />
}
