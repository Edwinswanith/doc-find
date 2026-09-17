# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Doc+Find: a fictional dermatology locum-staffing prototype (Next.js 16 / React 19 / App Router). Nine seeded identities (doctor, clinic manager, clinical approver, finance, operations) walk through vacancy → application/invitation → offer → acceptance → approval → readiness → booking → completion → invoice → payment. No real auth, professional-body checks, payments, or external messaging — everything is explicitly fictional/demo.

## Commands

```bash
pnpm install
cp .env.example .env.local
pnpm dev              # http://localhost:3000

docker compose up -d  # local MongoDB replica set (required for transactional commands)
pnpm seed             # seed doc_find_demo
pnpm reset:demo       # restore known fixture state

pnpm test             # vitest run
pnpm test:coverage    # vitest with coverage thresholds (80% branches/functions/lines/statements)
pnpm vitest run src/lib/workspace/domain.test.ts   # single test file
pnpm vitest run -t "test name"                      # single test by name
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint .
pnpm build            # next build
pnpm test:e2e         # playwright (starts pnpm dev itself via webServer)
pnpm exec playwright install chromium   # one-time browser install
```

Without `MONGODB_URI` set, the app and workspace store fall back to an in-process memory store (`global.docFindWorkspaceState`) — fine for `pnpm dev`/tests, but state resets on restart and isn't shared across serverless instances. `MONGODB_DB` must be exactly `doc_find_demo`; both the app (`src/lib/mongodb.ts`) and `reset:demo` refuse any other value as a safety rail against pointing this demo at a real database.

## Architecture

### Two engagement systems exist — only one is live

- **`src/lib/workspace/*`** (`types.ts`, `domain.ts`, `policy.ts`, `service.ts`, `store.ts`, `fixture.ts`) is the live system. Every route under `src/app/**/page.tsx` renders `SapphireWorkspacePage` → `SapphireWorkspace`, backed by this module.
- **`src/lib/demo-data.ts`, `src/lib/domain/{commands,workflow}.ts`, `src/lib/messaging.ts`, `src/lib/prototype-store.ts`, `src/components/{PrototypeApp,MessagingWorkspace}.tsx`** are an earlier iteration of the same idea (simpler state machine, different type shapes) that is no longer imported from any `src/app` route. It still has its own tests and is what `vitest.config.ts`'s coverage `include` targets (`src/lib/domain/**` + `messaging.ts`), so coverage numbers reflect the old code path, not `src/lib/workspace/*`. Don't wire new features into this path; when in doubt, check whether a page under `src/app` actually renders the component before extending it.

### Request flow (live system)

1. A page under `src/app/**` calls `SapphireWorkspacePage({ view, recordId, organisationId })` (`src/components/SapphireWorkspacePage.tsx`), which reads the signed prototype cookie, checks `canOpenWorkspaceView` (`workspace/policy.ts`) and redirects to the actor's default route if the view isn't permitted for their role.
2. It loads the full `WorkspaceState` via `getWorkspaceState()` (`workspace/store.ts`) and narrows it per-actor with `authorisedWorkspaceState()` (`workspace/policy.ts`) before ever reaching the client — this is the only access control on read paths, so new fields on `WorkspaceState` need a corresponding filter there.
3. `SapphireWorkspace` (client component) renders the narrowed state and issues commands back to `POST /api/v1/workflow/command` with `Idempotency-Key` and `Expected-Version` headers (see `domain/commands.ts:requireCommandHeaders` for the legacy equivalent, or the route directly for the live one).
4. The route (`app/api/v1/workflow/command/route.ts`) verifies the cookie, validates payload with zod, and delegates to `executeWorkspaceCommand()` (`workspace/service.ts`), a single large `if/else` chain keyed on `command` name that: checks role/ownership, checks `expectedVersion` against the stored version (optimistic concurrency), applies the state transition, appends an `auditEvents` entry and often a `notifications` entry, then persists via `saveWorkspaceState(next, state.version)`.
5. `store.ts` enforces optimistic concurrency itself: with Mongo, the `updateOne` filter includes `"state.version": expectedVersion`, so a stale write matches zero documents and throws `WORKSPACE_VERSION_CONFLICT`; without Mongo, the in-memory path checks `memoryState().version !== expectedVersion` the same way.
6. Idempotency is enforced in `executeWorkspaceCommand` itself via a `${actorId}:${command}:${idempotencyKey}` key stored in `state.idempotency` — a replayed request returns the previous result without re-applying the transition.

Messaging (`sendWorkspaceMessage`, `markConversationSeen` in `workspace/service.ts`) and onboarding drafts (`saveOnboardingDraft`) follow the same read-modify-`saveWorkspaceState`-with-expectedVersion shape but live outside the single command dispatcher, via their own API routes under `app/api/v1/conversations/[id]/*` and `app/api/v1/onboarding/[audience]/route.ts`.

### Auth model

`src/lib/prototype-session.ts` signs a cookie as `${userId}.${hmac(userId)}` using `PROTOTYPE_COOKIE_SECRET` (required in production, defaults to a hardcoded local value otherwise) against the fixed set of seeded users from `createWorkspaceFixture()`. There's no real login — the UI's role switcher just requests a new signed cookie. `readPrototypeCookie` falls back to the first seeded user if the cookie is missing/invalid, so an unauthenticated request is always treated as *some* demo user, never rejected — only `POST` command routes explicitly reject when `verifyPrototypeCookie` fails.

### Domain model shape

`workspace/types.ts` defines the full state graph: `Requirement` (vacancy) → `SessionOccurrence` (a specific dated session with `capacity`/`reserved`) → `CandidateEngagement` (a doctor×requirement pairing, `origins: application|invitation`, `stage` state machine) → `OfferVersion` (versioned; a new offer supersedes the previous `sent` one rather than mutating it) → `Booking` (created on offer acceptance) → `PaymentRecord`. Readiness for a booked occurrence (`calculateOccurrenceReadiness` / `calculateReadiness`) requires all three `EvidenceRecord` categories (`identity`, `registration`, `indemnity`) checked and valid past the session date, plus an `ApprovalRecord` matching site+scope+validity. Almost every mutable record carries its own `version` for optimistic concurrency, separate from the top-level `WorkspaceState.version`.

### Brand tokens

Sapphire Blue design system (see `design-qa.md` for the original brand QA pass): primary `#2457D6`, background `#F6F8FC`, text `#14243C`, highlight `#EAF0FF`, surface `#FFFFFF`, status success `#16A34A` / warning `#F59E0B` / error `#EF4444`. SF Pro Display/Text with Segoe UI fallback. Defined in `src/app/globals.css`.

## Working in this repo

- This is a Next.js "canary"/major-version-16 app — before writing App Router or server/client component code, check `node_modules/next/dist/docs/` for breaking changes relative to older Next.js conventions (this note is auto-managed by `next dev` in `AGENTS.md`; don't hand-edit that block).
- Money is always integer minor units (`rateMinor`, `amountMinor`, GBP only) — format with the `money()` helper pattern (`Intl.NumberFormat` on `value / 100`), never floats.
- Every workflow-mutating command must go through `executeWorkspaceCommand` with an idempotency key and expected version; don't add a new API route that mutates `WorkspaceState` outside that pattern without the same concurrency/idempotency handling.
- New fields added to `WorkspaceState` must be threaded through `authorisedWorkspaceState()` in `workspace/policy.ts`, or they'll leak between roles/organisations on the read path.
