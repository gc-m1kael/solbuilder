import { v } from "convex/values"

export const GENERATION_STATUSES = [
  "queued",
  "preparing_repository",
  "creating_convex",
  "creating_vercel",
  "configuring_environment",
  "starting_cursor",
  "cursor_running",
  "deploying_convex",
  "deploying_vercel",
  "completed",
  "failed",
] as const

export type GenerationStatus = (typeof GENERATION_STATUSES)[number]

export const generationStatusValidator = v.union(
  v.literal("queued"),
  v.literal("preparing_repository"),
  v.literal("creating_convex"),
  v.literal("creating_vercel"),
  v.literal("configuring_environment"),
  v.literal("starting_cursor"),
  v.literal("cursor_running"),
  v.literal("deploying_convex"),
  v.literal("deploying_vercel"),
  v.literal("completed"),
  v.literal("failed")
)

export const ACTIVE_GENERATION_STATUSES: ReadonlyArray<GenerationStatus> = [
  "queued",
  "preparing_repository",
  "creating_convex",
  "creating_vercel",
  "configuring_environment",
  "starting_cursor",
  "cursor_running",
  "deploying_convex",
  "deploying_vercel",
]

export function isTerminalStatus(status: GenerationStatus): boolean {
  return status === "completed" || status === "failed"
}

export function isActiveStatus(status: GenerationStatus): boolean {
  return ACTIVE_GENERATION_STATUSES.includes(status)
}

export const PROGRESS_MESSAGES: Partial<Record<GenerationStatus, string>> = {
  preparing_repository: "Preparing the app repository",
  creating_convex: "Creating the app backend",
  creating_vercel: "Creating the app hosting project",
  configuring_environment: "Configuring environment variables",
  starting_cursor: "Starting Cursor",
  cursor_running: "Cursor is implementing the requested changes",
  deploying_convex: "Deploying the app backend",
  deploying_vercel: "Deploying the updated app",
  completed: "App deployed successfully",
}
