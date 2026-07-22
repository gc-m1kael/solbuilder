# SolBuilder

SolBuilder is an AI builder for collaborative Solana apps. Browse app spaces, chat with members and SolBuilder, then open the generated app in a full-screen preview.

## Current status

**Auth + generation backend foundation** is in place.

- Clerk sign-in + ConvexProviderWithClerk
- Convex Agent threads (one per app)
- Convex Workflow for durable app generation
- Schema: `apps`, `appMembers`, `generationJobs`
- Typed adapters for GitHub, Convex Platform, Vercel, Cursor
- Frontend screens may still use mock data until wired to these functions

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
