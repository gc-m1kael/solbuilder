# SolBuilder Agent Guide

## Product purpose

SolBuilder is an AI builder for collaborative Solana apps. Creators chat in group threads to shape apps, then open the generated app in a full-screen preview. The Builder hosts auth and wallet access later — generated apps never integrate those themselves.

## Current active phase

**AI app-generation backend foundation (Convex Agent + Workflow)**

Backend can create apps, Agent threads, generation jobs, and run the durable provisioning/Cursor workflow. Frontend may still use mocks until wired. Do **not** implement unrelated future UI work unless explicitly requested.

## Complete roadmap

1. **Phase 1 — Builder shell**  
   Mobile messenger shell: apps list, group chat, generated-app iframe. Mock data only. Preview URL via `VITE_GENERATED_APP_URL`.

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

7. **Phase 7 — Provisioning**  
   Automate GitHub repo creation, starter push, Vercel project, env vars, deployment, and Convex project creation.

## Generation backend (implemented)

- One Convex Agent thread per app (`apps.threadId`)
- Durable Convex Workflow orchestrates provisioning + Cursor + deploy waits
- Tables: `apps`, `appMembers`, `generationJobs`
- Public functions: `apps.createApp`, `apps.listApps`, `apps.getApp`, `threads.getOrCreateAppThread`, `threads.listAppMessages`, `generation.sendAppMessage`, `generation.getGenerationStatus`, `generation.retryGeneration`
- External adapters: GitHub, Convex Platform, Vercel, Cursor

### Workflow states

`queued` → `preparing_repository` → `creating_convex` → `creating_vercel` → `configuring_environment` → `starting_cursor` → `cursor_running` → `deploying_convex` → `deploying_vercel` → `completed` | `failed`

### Architecture boundaries

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
- Cursor must preserve `src/solbuilder/**`

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
- Mobile-first single layout; desktop uses a centered max-width container.
- Do not implement fake blockchain logic.
- Do not fake successful provisioning when credentials are missing.
- Every phase must end with a working build and a clean commit.
- Stop after completing the requested phase.
