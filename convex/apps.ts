import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getAppMembership, requireAppMember, requireIdentity } from "./lib/auth"
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
  inviteCode: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

function memberNameFromIdentity(identity: {
  name: string | null
  email: string | null
  subject: string
}): string {
  return identity.name ?? identity.email ?? identity.subject.slice(0, 8)
}

function generateInviteCode(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
  let code = ""
  for (let i = 0; i < 10; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

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
      name: memberNameFromIdentity(identity),
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

export const getOrCreateInviteCode = mutation({
  args: { appId: v.id("apps") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { app } = await requireAppMember(ctx, args.appId)
    if (app.inviteCode) {
      return app.inviteCode
    }
    const code = generateInviteCode()
    await ctx.db.patch(args.appId, { inviteCode: code })
    return code
  },
})

export const joinAppByInviteCode = mutation({
  args: { code: v.string() },
  returns: v.union(v.null(), v.object({ appId: v.id("apps"), name: v.string() })),
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const code = args.code.trim()
    if (!code) {
      return null
    }

    const app = await ctx.db
      .query("apps")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique()
    if (!app) {
      return null
    }

    const existing = await getAppMembership(ctx, app._id, identity.subject)
    if (!existing) {
      await ctx.db.insert("appMembers", {
        appId: app._id,
        userId: identity.subject,
        role: "member",
        name: memberNameFromIdentity(identity),
        createdAt: Date.now(),
      })
    }

    return { appId: app._id, name: app.name }
  },
})

export const listMembers = query({
  args: { appId: v.id("apps") },
  returns: v.array(
    v.object({ userId: v.string(), name: v.string(), role: v.string() })
  ),
  handler: async (ctx, args) => {
    await requireAppMember(ctx, args.appId)
    const rows = await ctx.db
      .query("appMembers")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect()
    return rows.map((row) => ({
      userId: row.userId,
      name: row.name ?? "Member",
      role: row.role,
    }))
  },
})
