import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAppMember, requireIdentity } from "./lib/auth"
import { generationStatusValidator } from "./lib/status"
import { randomSuffix, slugifyName, withSuffix } from "./lib/slugify"

const appReturnValidator = v.object({
  _id: v.id("apps"),
  _creationTime: v.number(),
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

export const createApp = mutation({
  args: {
    name: v.string(),
  },
  returns: appReturnValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const name = args.name.trim()
    if (!name) {
      throw new Error("App name is required")
    }

    const baseSlug = slugifyName(name)
    let slug = baseSlug
    for (let attempt = 0; attempt < 8; attempt++) {
      const existing = await ctx.db
        .query("apps")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (!existing) {
        break
      }
      slug = withSuffix(baseSlug, randomSuffix(4), 56)
    }

    const now = Date.now()
    const appId = await ctx.db.insert("apps", {
      ownerId: identity.subject,
      name,
      slug,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert("appMembers", {
      appId,
      userId: identity.subject,
      role: "owner",
      createdAt: now,
    })

    const app = await ctx.db.get(appId)
    if (!app) {
      throw new Error("Failed to create app")
    }
    return app
  },
})

export const listApps = query({
  args: {},
  returns: v.array(appReturnValidator),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const memberships = await ctx.db
      .query("appMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect()

    const apps = []
    for (const membership of memberships) {
      const app = await ctx.db.get(membership.appId)
      if (app) {
        apps.push(app)
      }
    }

    apps.sort((a, b) => b.updatedAt - a.updatedAt)
    return apps
  },
})

export const getApp = query({
  args: { appId: v.id("apps") },
  returns: v.union(appReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const { app } = await requireAppMember(ctx, args.appId)
    return app
  },
})
