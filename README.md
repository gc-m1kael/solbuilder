# SolBuilder

SolBuilder is an AI builder for collaborative Solana apps. Browse app spaces, chat with members and SolBuilder, then open the generated app in a full-screen preview.

## Current status

**End-to-end demo**: messenger UI wired to the live Convex backend.

- Clerk sign-in + ConvexProviderWithClerk
- Apps list, group chat, and generated-app preview backed by real Convex data
- Plain chat messages persist to the app's Agent thread
- Messages mentioning `@cursor` start the durable generation workflow
- Workflow provisions GitHub repo → Convex project → Vercel project → runs a
  Cursor background agent → waits for deploys → posts the preview URL in chat
- Generation progress and failures render in the chat with a Retry action
- Phantom wallet connection owned by the host; generated apps request SOL
  transfers through the typed iframe bridge (devnet, capped, no arbitrary signing)

## Demo flow

1. Sign in with Clerk, connect Phantom (devnet).
2. Tap **+** to create an app, open its group chat.
3. Chat normally, or send a message mentioning `@cursor` to build/update the app.
4. Watch progress messages; when generation completes the deployed URL is
   posted in chat and **Open app** shows the live app in the iframe.
5. The generated app receives user/members/wallet context via the bridge and
   can request a SOL transfer, approved in the host.

## Architecture overview

```text
ClerkProvider
└── ConvexProviderWithClerk
    ├── Unauthenticated → Clerk <SignIn />
    └── Authenticated → Apps list / Group chat / Generated app
            │
            └── Convex backend
                ├── Agent thread per app
                └── generateAppWorkflow
                    ├── GitHub starter repo
                    ├── Convex generated-app project
                    ├── Vercel project + env
                    ├── Cursor Background Agent
                    └── Deploy wait + final URLs
```

## Public Convex functions (frontend)

| Function | Purpose |
|---|---|
| `apps.createApp` | Create app + owner membership |
| `apps.listApps` | List apps for the signed-in user |
| `apps.getApp` | Get one app (member-only) |
| `threads.getOrCreateAppThread` | Ensure Agent thread for an app |
| `threads.listAppMessages` | Paginated Agent UI messages |
| `generation.sendAppMessage` | Save prompt, start workflow, return job/workflow ids |
| `generation.getGenerationStatus` | Latest (or specific) job status |
| `generation.retryGeneration` | Retry a failed job (reuses infra IDs) |

## Backend environment variables

Set on the Convex deployment (`npx convex env set ...`):

- `CLERK_JWT_ISSUER_DOMAIN`
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_STARTER_REPO`
- `VERCEL_TOKEN`, `VERCEL_TEAM_ID`
- `CONVEX_TEAM_TOKEN`, `CONVEX_TEAM_ID` (optional `CONVEX_TEAM_SLUG` label)
- `CURSOR_API_KEY`, optional `CURSOR_WEBHOOK_SECRET`
- `CONVEX_SITE_URL` (webhook + host URL for generated apps)
- Optional `SOLBUILDER_ADAPTER_MODE=stub` to refuse provisioning clearly

Vite client vars remain in `.env` / `.env.example` (`VITE_*`).

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev:convex   # codegen + Convex backend
pnpm dev          # Vite UI
```

Production build:

```bash
pnpm build
pnpm preview
```

## Notes

- Scaffolded with `pnpm dlx shadcn@latest init --preset b6Z8DTUBu --template vite`
- Mobile-first single layout; desktop centers a max-width shell
- See `AGENTS.md` for agent-facing product and phase rules
- Generation adapters call real APIs when credentials are set; missing credentials fail clearly (no fake success)
