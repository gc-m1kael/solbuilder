# SolBuilder Agent Guide

## Product purpose

SolBuilder is an AI builder for collaborative Solana apps. Creators chat with the Builder to generate and iterate on apps that receive identity and wallet capabilities from the Builder host — never by integrating auth or wallets themselves.

## Current active phase

**Phase 1 — Builder shell (completed)**

Working desktop Builder UI with apps sidebar, chat panel, iframe preview, project top bar, mock data, and a static local demo app loaded in the iframe.

Do **not** implement future phases unless explicitly requested.

## Complete roadmap

1. **Phase 1 — Builder shell**  
   Apps sidebar, chat panel, iframe preview, top bar, mock data, static demo app. No external integrations.

2. **Phase 2 — Host bridge**  
   Typed `postMessage` communication between the Builder and generated apps (current user, wallet address, members, supported host actions).

3. **Phase 3 — Solana wallet bridge**  
   Connect Phantom in the Builder. Generated apps request SOL transfers (devnet only) through the host bridge. No arbitrary transaction signing. Apps never access Phantom directly.

4. **Phase 4 — Cursor app updates**  
   Connect Builder chat to Cursor so a prompt updates an existing generated-app repo, commits, deploys, and refreshes preview.

5. **Phase 5 — Persistence**  
   Convex for apps, messages, app members, and generation status.

6. **Phase 6 — Authentication**  
   Clerk auth and membership handling owned by the Builder.

7. **Phase 7 — Provisioning (optional)**  
   Automate GitHub repo creation, starter push, Vercel project, env vars, deployment, and Convex project creation.

## Architecture boundaries

### The Builder owns

- authentication
- wallet connection
- app management
- AI conversations
- infrastructure
- deployment

### Generated apps

- never authenticate users
- never connect wallets directly
- never receive private keys
- receive identity from the Builder
- request supported blockchain actions through the Builder
- stay isolated from Builder internals

Future generated apps will use an API similar to:

```ts
const {
  user,
  members,
  requestSolTransfer,
} = useSolBuilder()
```

Do not implement that API until the relevant phase is requested.

## Engineering rules

- Prefer the simplest working implementation.
- Avoid premature abstractions.
- Use strict TypeScript.
- Keep components reasonably small.
- Use shadcn components where appropriate.
- Preserve the selected shadcn preset (colors, fonts, radius, icon library, CSS variables, dark theme).
- Do not redesign the theme.
- Avoid unnecessary custom CSS.
- Desktop-first only; no mobile navigation yet.
- Do not introduce a backend until the persistence phase.
- Do not implement fake blockchain logic.
- Every phase must end with a working build and a clean commit.
- Stop after completing the requested phase.
