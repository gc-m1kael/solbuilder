# SolBuilder

SolBuilder is an AI builder for collaborative Solana apps. Browse app spaces, chat with members and SolBuilder, then open the generated app in a full-screen preview.

## Current status

**Phase 1 mobile messenger + Clerk/Convex auth** is implemented.

- Three screens: apps list → group chat → generated app
- Clerk sign-in when signed out; three-screen UI when signed in
- ConvexProviderWithClerk + minimal `auth.currentUser` query
- Apps/messages still mocked (no full DB schema yet)
- Generated app iframe via `VITE_GENERATED_APP_URL`
- No Phantom / iframe bridge yet

## Architecture overview

```text
ClerkProvider
└── ConvexProviderWithClerk
    ├── Unauthenticated → Clerk <SignIn />
    └── Authenticated → Apps list / Group chat / Generated app
```

## Roadmap

1. Builder shell (current)
2. Host bridge (`postMessage`)
3. Solana wallet bridge (Phantom via Builder, SOL transfers on devnet)
4. Cursor app updates
5. Persistence (Convex)
6. Authentication (Clerk)
7. Provisioning (optional)

## Local development

```bash
pnpm install
cp .env.example .env
# optional: set VITE_GENERATED_APP_URL=https://your-app.example
pnpm dev
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
