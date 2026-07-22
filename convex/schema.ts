import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { generationStatusValidator } from "./lib/status"

export default defineSchema({
  apps: defineTable({
    ownerId: v.string(),
    name: v.string(),
    slug: v.string(),
    threadId: v.optional(v.string()),
    status: generationStatusValidator,
    githubRepoUrl: v.optional(v.string()),
    githubRepoFullName: v.optional(v.string()),
    githubDefaultBranch: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    vercelProjectName: v.optional(v.string()),
    vercelDeploymentUrl: v.optional(v.string()),
    generatedConvexProjectId: v.optional(v.string()),
    generatedConvexProjectSlug: v.optional(v.string()),
    generatedConvexDeploymentName: v.optional(v.string()),
    generatedConvexDeploymentUrl: v.optional(v.string()),
    cursorAgentId: v.optional(v.string()),
    activeWorkflowId: v.optional(v.string()),
    activeJobId: v.optional(v.id("generationJobs")),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_thread", ["threadId"])
    .index("by_updated", ["updatedAt"]),

  appMembers: defineTable({
    appId: v.id("apps"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_app", ["appId"])
    .index("by_user", ["userId"])
    .index("by_app_user", ["appId", "userId"]),

  generationJobs: defineTable({
    appId: v.id("apps"),
    userId: v.string(),
    prompt: v.string(),
    status: generationStatusValidator,
    currentStep: v.string(),
    workflowId: v.optional(v.string()),
    error: v.optional(v.string()),
    promptMessageId: v.optional(v.string()),
    cursorAgentId: v.optional(v.string()),
    githubRepoUrl: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    vercelDeploymentId: v.optional(v.string()),
    generatedConvexProjectId: v.optional(v.string()),
    lastProgressMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_app", ["appId"])
    .index("by_app_created", ["appId", "createdAt"])
    .index("by_status", ["status"])
    .index("by_workflow", ["workflowId"]),
})
