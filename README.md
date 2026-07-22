# SolBuilder

SolBuilder is an AI builder for collaborative Solana apps. Chat in the Builder to shape an app, preview it in an iframe, and (in later phases) deploy updates while the Builder hosts auth and wallet access for generated apps.

## Current status

**Phase 1 — Builder shell** is implemented.

- Desktop Builder UI: top bar, apps sidebar, chat panel, preview panel
- Mock apps, messages, and user data
- Static demo app at `public/demo-app/index.html` loaded in the preview iframe
- No Clerk, Convex, Solana, Cursor, GitHub, or Vercel integrations yet

This version uses **mock data** only.

## Architecture overview

```text
Builder (this app)
├── Apps sidebar     select mock apps
├── Chat panel       mock conversation + local send
├── Preview panel    iframe → /demo-app/index.html
└── Top bar          app name, status, wallet placeholder, user avatar

Generated apps (later)
└── receive identity / request host actions via postMessage (Phase 2+)
```

The Builder will own authentication, wallet connection, app management, AI conversations, and deployment. Generated apps stay isolated and never connect wallets or implement their own auth.

## Roadmap

1. Builder shell (current)
2. Host bridge (`postMessage`)
3. Solana wallet bridge (Phantom via Builder, SOL transfers on devnet)
4. Cursor app updates
5. Persistence (Convex)
6. Authentication (Clerk)
7. Provisioning (optional: GitHub, Vercel, Convex automation)

## Local development

```bash
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
pnpm preview
```

## Notes

- Scaffolded with `pnpm dlx shadcn@latest init --preset b6Z8DTUBu --template vite`
- Desktop-first layout; no mobile navigation yet
- See `AGENTS.md` for agent-facing product and phase rules
