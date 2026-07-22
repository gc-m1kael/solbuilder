export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  userId: string | null
  createdAt: number
}

/**
 * Normalizes messages coming back from api.threads.listAppMessages.
 * Handles both a plain array and a paginated { page: [...] } result, and
 * both agent UIMessage items ({ key, _creationTime, ... }) and the
 * normalized shape ({ id, role, text, userId, createdAt }).
 */
export function normalizeMessages(value: unknown): ChatMessage[] {
  const items: unknown[] = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        Array.isArray((value as { page?: unknown }).page)
      ? (value as { page: unknown[] }).page
      : []

  const messages: ChatMessage[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== "object") {
      continue
    }
    const item = raw as Record<string, unknown>
    const text = typeof item.text === "string" ? item.text : ""
    if (!text.trim()) {
      continue
    }
    const id =
      typeof item.id === "string" && item.id
        ? item.id
        : typeof item.key === "string" && item.key
          ? item.key
          : typeof item._id === "string" && item._id
            ? item._id
            : `msg-${messages.length}`
    const createdAt =
      typeof item.createdAt === "number"
        ? item.createdAt
        : typeof item._creationTime === "number"
          ? item._creationTime
          : 0

    messages.push({
      id,
      role: item.role === "user" ? "user" : "assistant",
      text,
      userId: typeof item.userId === "string" ? item.userId : null,
      createdAt,
    })
  }

  messages.sort((a, b) => a.createdAt - b.createdAt)
  return messages
}

export const GENERATION_STEP_LABELS: Record<string, string> = {
  queued: "Queued",
  preparing_repository: "Preparing repository",
  creating_convex: "Creating Convex project",
  creating_vercel: "Creating Vercel project",
  configuring_environment: "Configuring environment",
  starting_cursor: "Starting Cursor agent",
  cursor_running: "Cursor is building your app",
  deploying_convex: "Deploying backend",
  deploying_vercel: "Deploying to Vercel",
  completed: "Ready",
  failed: "Failed",
}

export function initialsForName(name: string): string {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
  return initials || "A"
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

/** Strips Convex error prefixes like "[CONVEX M(...)] [Request ID: ...] Server Error Uncaught Error: ..." */
export function cleanErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error && error.message
      ? error.message
      : "Something went wrong"
  const marker = "Uncaught Error: "
  const index = raw.indexOf(marker)
  const message = index >= 0 ? raw.slice(index + marker.length) : raw
  return message.split("\n")[0]?.trim() || "Something went wrong"
}
