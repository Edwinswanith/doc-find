# Doc+Find local prototype

High-fidelity, mobile-first workflow prototype for fictional dermatology outpatient staffing in England.

## What is implemented

- Nine seeded identities across doctor, clinic manager, clinical approver, finance and operations workspaces.
- Vacancy discovery/application and direct-invitation entry routes converging on one engagement.
- Structured offer, acceptance, approval, readiness, booking, completion and payment-record states.
- Route-aware Sapphire Workspace navigation, URL-backed candidate context and focused role-specific Today pages.
- Persistent two-way engagement messaging, proposed session prices, precise seen timestamps and multi-request notifications.
- Controlled phone visibility, evidence states, notifications and audit-oriented timelines.
- Responsive Sapphire Blue interface with mobile bottom navigation, keyboard focus and reduced-motion support.
- Local MongoDB seed, replica-set configuration and a server-authorised command endpoint with version/idempotency checks.

Every identity and transaction displayed is fictional. There are no live professional checks, contracts, payments or external messages.

## Run the interface

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Without `MONGODB_URI`, local development uses an explicitly labelled process-memory demonstration store. Configure Atlas to persist separate sessions. Use the dark sidebar's **Prototype only** area to switch roles and reset the walkthrough.

## Run MongoDB and seed the workflows

Install and start Docker Desktop, then run:

```bash
docker compose up -d
pnpm seed
```

MongoDB must support transactions for consequential workflow commands. Set `MONGODB_DB=doc_find_demo`; the application and seed command refuse any other demo database. `pnpm reset:demo` restores the known fictional Sapphire V1 state.

Recommended `.env.local` values:

```bash
MONGODB_URI=mongodb+srv://least-privileged-demo-user:REDACTED@your-cluster/
MONGODB_DB=doc_find_demo
PROTOTYPE_COOKIE_SECRET=replace-with-a-long-random-local-secret
DEMO_MODE=true
```

Rotate any credential that has appeared outside your secret manager. Never commit `.env.local`.

When `MONGODB_URI` is configured, database failures are reported rather than silently falling back to process memory.

## Verify

```bash
pnpm test
pnpm test:coverage
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
```

Playwright browsers may need to be installed once with `pnpm exec playwright install chromium`.

## Messaging demonstration

Use the prototype user switcher to test the complete seeded conversations:

1. Select **Sarah Whitmore**, open **Candidates**, and choose one of the three doctor applications.
2. Open **Conversation**. The doctor's message is marked seen and the doctor sees the exact timestamp.
3. As Sarah, write one message, optionally add a per-session price and send it.
4. Switch to **Dr Anika Rao**. Her notifications contain approaches from both Harley Street Skin Centre and Riverside Dermatology.
5. Open the Harley Street conversation. Switching back to Sarah shows the new message's seen timestamp.

Proposed prices inside a message are explicitly discussion-only. They do not accept an offer, reserve capacity or mark a booking ready.

## Prototype boundaries

No real authentication, OTP, GMC/CQC/DBS lookup, cloud storage, email, SMS, payment processing, production deployment or legal approval is included. The signed role cookie is a prototype mechanism and is not production authentication.
