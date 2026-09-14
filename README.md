# Doc+Find local prototype

High-fidelity, mobile-first workflow prototype for fictional dermatology outpatient staffing in England.

## What is implemented

- Nine seeded identities across doctor, clinic manager, clinical approver, finance and operations workspaces.
- Vacancy discovery/application and direct-invitation entry routes converging on one engagement.
- Structured offer, acceptance, approval, readiness, booking, completion and payment-record states.
- Two-way engagement messaging, proposed session prices, precise seen timestamps and scrollable multi-request notifications.
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

Open [http://localhost:3000](http://localhost:3000). Without `MONGODB_URI`, consequential actions use an explicitly prototype-only process-memory command store. Use the dark prototype bar to switch roles and reset the walkthrough.

## Run MongoDB and seed the workflows

Install and start Docker Desktop, then run:

```bash
docker compose up -d
pnpm seed
```

The MongoDB service runs as a single-node replica set because consequential workflow commands use transactions. `pnpm reset:demo` clears only the named Doc+Find prototype collections in the configured `medilink` database and reseeds fictional records.

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

1. Select **Sarah Whitmore**, open notifications and choose one of the three doctor approaches. Opening the message marks it seen.
2. Switch to that doctor, open **Inbox**, and inspect the exact seen date and time beneath the sent message.
3. As Sarah, open the Dr Anika Rao conversation, write one message, optionally add a per-session price and send it.
4. Switch to **Dr Anika Rao**. Her notifications contain approaches from both Harley Street Skin Centre and Riverside Dermatology.
5. Open the Harley Street conversation. Switching back to Sarah shows the new message's seen timestamp.

Proposed prices inside a message are explicitly discussion-only. They do not accept an offer, reserve capacity or mark a booking ready.

## Prototype boundaries

No real authentication, OTP, GMC/CQC/DBS lookup, cloud storage, email, SMS, payment processing, production deployment or legal approval is included. The signed role cookie is a prototype mechanism and is not production authentication.
