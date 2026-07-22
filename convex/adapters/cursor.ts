import { assertNotStub, requireEnv } from "../lib/env"

const CURSOR_API = "https://api.cursor.com"

export type CursorAgentStatus =
  | "CREATING"
  | "RUNNING"
  | "FINISHED"
  | "ERROR"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | string

export type CursorAgent = {
  id: string
  status: CursorAgentStatus
  summary?: string
  target?: {
    branchName?: string
    url?: string
    prUrl?: string
  }
  source?: {
    repository?: string
    ref?: string
  }
}

export type CursorConversationMessage = {
  id: string
  type: "user_message" | "assistant_message" | string
  text: string
}

function getApiKey(): string {
  return requireEnv("CURSOR_API_KEY")
}

async function cursorRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  assertNotStub("Cursor")
  const apiKey = getApiKey()

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${CURSOR_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 429 && attempt < 2) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "1")
      await new Promise((r) => setTimeout(r, Math.min(retryAfter * 1000 * 2 ** attempt, 15_000)))
      continue
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Cursor API ${method} ${path} failed (${res.status}): ${text || res.statusText}`)
    }

    return (await res.json()) as T
  }

  throw new Error(`Cursor API ${method} ${path} failed after retries`)
}

export function buildCursorPrompt(args: {
  userPrompt: string
  appName: string
}): string {
  return [
    "You are building a SolBuilder generated app: a small, polished, collaborative Solana app that runs inside a phone-sized iframe in the SolBuilder host.",
    "",
    "Read AGENTS.md in this repository first and follow its boundaries exactly.",
    "",
    "## Product & design (this matters most)",
    "- src/generated/App.tsx is a blank canvas. Design a UI **specifically for this request** — never a generic dashboard or a recycled template layout.",
    "- Decide the app's personality (game, tool, tracker, social) and commit to it: layout, accent colors, type scale, and copywriting should all match.",
    "- Mobile-first (~390px wide). Big touch targets, hero numbers, bold buttons, playful empty states. Subtle motion with tw-animate-css is encouraged.",
    "- Use Tailwind v4 and the shadcn primitives in src/components/ui/; create new components under src/generated/.",
    "- Personalize with runtime data from useSolBuilder(): greet the user by name, render members as avatars/initials, react to wallet connected state.",
    "- Every SOL transfer must show pending/success/error/cancelled states honestly. Never fake a confirmation.",
    "- The app should feel finished: no lorem ipsum, no dead buttons, no placeholder screens.",
    "",
    "## Hard requirements",
    "- Preserve src/solbuilder/** exactly — do not modify the host bridge SDK.",
    "- Never add Clerk auth, wallet adapters, Phantom access, or private key handling.",
    "- Only use useSolBuilder() from @/solbuilder for identity, members, wallet, and transfers.",
    "- Run the build (pnpm build) and fix all errors before finishing.",
    "- Commit and push your completed work to the remote branch.",
    "",
    `App name: ${args.appName}`,
    "",
    "## User request",
    args.userPrompt,
  ].join("\n")
}

export async function startAgent(args: {
  prompt: string
  repositoryUrl: string
  sourceRef?: string
  webhookUrl?: string
  webhookSecret?: string
  model?: string
}): Promise<CursorAgent> {
  const body: Record<string, unknown> = {
    prompt: { text: args.prompt },
    source: {
      repository: args.repositoryUrl,
      ...(args.sourceRef ? { ref: args.sourceRef } : {}),
    },
  }

  if (args.webhookUrl) {
    body.webhook = {
      url: args.webhookUrl,
      ...(args.webhookSecret ? { secret: args.webhookSecret } : {}),
    }
  }

  if (args.model) {
    body.model = args.model
  }

  const response = await cursorRequest<{
    id: string
    status: string
    target?: { branchName?: string; url?: string; prUrl?: string }
    source?: { repository?: string; ref?: string }
    summary?: string
  }>("POST", "/v0/agents", body)

  return {
    id: response.id,
    status: response.status,
    summary: response.summary,
    target: response.target,
    source: response.source,
  }
}

export async function getAgentStatus(agentId: string): Promise<CursorAgent> {
  const response = await cursorRequest<{
    id: string
    status: string
    summary?: string
    target?: { branchName?: string; url?: string; prUrl?: string }
    source?: { repository?: string; ref?: string }
  }>("GET", `/v0/agents/${agentId}`)

  return {
    id: response.id,
    status: response.status,
    summary: response.summary,
    target: response.target,
    source: response.source,
  }
}

export async function getAgentConversation(
  agentId: string
): Promise<CursorConversationMessage[]> {
  const response = await cursorRequest<{
    id: string
    messages: Array<{ id: string; type: string; text: string }>
  }>("GET", `/v0/agents/${agentId}/conversation`)

  return response.messages ?? []
}

export function isCursorTerminal(status: string): boolean {
  const normalized = status.toLowerCase()
  return (
    normalized === "finished" ||
    normalized === "error" ||
    normalized === "failed" ||
    normalized === "expired" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  )
}

export function isCursorSuccess(status: string): boolean {
  return status.toLowerCase() === "finished"
}

export function pickMeaningfulAssistantMessages(
  messages: CursorConversationMessage[],
  alreadySeen: Set<string>
): CursorConversationMessage[] {
  const meaningful: CursorConversationMessage[] = []
  for (const message of messages) {
    if (message.type !== "assistant_message") continue
    if (alreadySeen.has(message.id)) continue
    const text = message.text.trim()
    if (text.length < 24) continue
    // Skip noisy tiny status pings
    if (/^(ok|done|working|thinking)\.?$/i.test(text)) continue
    alreadySeen.add(message.id)
    meaningful.push(message)
  }
  return meaningful
}
