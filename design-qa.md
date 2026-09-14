# Doc+Find Sapphire Brand Implementation QA

## Comparison target

- Source visual truth: `/var/folders/49/3d6v4z396fs0bgq5h32_j0rr0000gn/T/codex-clipboard-738fd85f-a1f4-4c2f-9822-f1a3934ca76e.png`
- Palette reference asset: `public/medilink-brand-system.png`
- Desktop implementation: `doc-find-professional-type-desktop.png`
- Mobile implementation: `doc-find-professional-type-mobile-320.png`
- Source pixels: 1122 x 1402.
- Desktop capture: 1440px viewport.
- Mobile capture: 320px viewport.

The supplied board remains the colour and system reference, not page content. The visible product identity is now Doc+Find, with the staffing workflow, palette, typography, components, navigation and semantic status treatment preserved.

## Brand fidelity

| Brand element | Implemented result |
| --- | --- |
| Primary | Exact `#2457D6` for key actions, active navigation, links and focus states |
| Background | Exact Cloud White `#F6F8FC` across the application canvas and navigation shell |
| Text | Exact navy `#14243C` for headings and primary copy |
| Highlight | Exact `#EAF0FF` for selected states, chips and contextual messages |
| Surface | Exact `#FFFFFF` for cards, sheets, message panels and controls |
| Status accents | Exact success `#16A34A`, warning `#F59E0B` and error `#EF4444`; darker companion inks retain AA-readable text |
| Wordmark | Custom Doc+Find lockup uses a compact Sapphire healthcare cross, navy “Doc” and Sapphire “Find” |
| Typography | Native SF Pro Display and SF Pro Text stack with Segoe UI fallback follows the board's 32/40, 24/32, 16/24, 14/20 and 12/16 rhythm |

## Full-view comparison evidence

- The previous dark-sidebar and editorial-serif treatment was replaced by the source board's light, clinical Sapphire and Cloud White system.
- Desktop navigation uses highlight fills and a Sapphire active indicator, matching the supplied navigation language.
- The mobile app bar retains the Doc+Find identity after the desktop sidebar disappears.
- Cards, rounded controls, 48px primary targets, status pills and restrained borders follow the source component examples.
- The focused Doc+Find wordmark replaces the former reference-board name without gradients, placeholder images or unrelated decoration.

## Functional evidence

- Four clinic-manager conversations remain individually selectable.
- Multiple doctor approaches generate separate scrollable notifications.
- Opening a received message records an immutable first-seen timestamp visible to its sender.
- Clinic and doctor users can send one contextual message with an optional GBP proposed price.
- Proposed price messages remain explicitly separate from an accepted structured offer.
- Completed application and invitation actions cannot replay `apply` or `invite` after `offer_sent`.

## Responsive and accessibility evidence

- Fresh browser inspection at 320px reports a 320px document width and no horizontal overflow.
- The Doc+Find wordmark remains visible in the mobile application header.
- Critical controls retain 48px targets, keyboard focus styling and non-colour state labels.
- Mobile and desktop axe checks report no serious accessibility violations.
- Fresh browser inspection reports zero console errors.

## Comparison history

### Iteration 1

- Finding: supporting status tokens used older darker source values and headings used an editorial serif that was not present in the supplied brand system.
- Fix: map all exact board accents and replace the display face with a clean sans-serif hierarchy.

### Iteration 2

- Finding: the dark desktop navigation competed with the Cloud White brand direction.
- Fix: introduce the light navigation shell, Sapphire highlight treatment and the supplied wordmark asset.

### Iteration 3

- Finding: the mobile breakpoint removed the sidebar and therefore removed the brand identity.
- Fix: add a compact identity lockup to the mobile app header.

### Iteration 4

- Finding: the palette reference still carried the former MediLink title and did not give Doc+Find a distinctive identity.
- Fix: create one responsive Doc+Find wordmark, update browser and installable-app metadata, replace the application monogram and rename visible operations ownership.

### Iteration 5

- Finding: Avenir's heavier available weights made headings, buttons and dashboard metrics appear overly rounded and visually loud.
- Fix: adopt a native SF Pro and Segoe UI stack with antialiasing, controlled display typography and calmer 600 to 700 interface weights.

## Validation

- 28 unit tests passed.
- Coverage passed at 97.64% statements, 94.73% branches, 92.3% functions and 97.01% lines.
- 12 Playwright tests passed across mobile and desktop, including both messaging routes, seen timestamps, price proposals, workflow transition guards and axe gates.
- TypeScript, ESLint and the optimized Next.js production build passed.
- Exact runtime token values and 320px containment were checked in a fresh browser session.

final result: passed
