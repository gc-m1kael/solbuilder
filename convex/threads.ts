import { v } from "convex/values"
import { createThread, saveMessage, listUIMessages } from "@convex-dev/agent"
import { paginationOptsValidator } from "convex/server"
import { components, internal } from "./_generated/api"
import { mutation, query, internalMutation } from "./_generated/server"
import { requireAppMember, requireIdentity } from "./lib/auth"
import { PROGRESS_MESSAGES, type GenerationStatus } from "./lib/status"

export const ensureThreadForApp = internalMutation({
  args: { appId: v.id("apps") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId)
    if (!app) {
      throw new Error("App not found")
    }
    if (app.threadId) {
      return app.threadId
    }

    const threadId = await createThread(ctx, components.agent, {})
    await ctx.db.patch(args.appId, {
      threadId,
      updatedAt: Date.now(),
    })
    return threadId
  },
})

export const getOrCreateAppThread = mutation({
  args: { appId: v.id("apps") },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    await requireAppMember(ctx, args.appId)
    return await ctx.runMutation(internal.threads.ensureThreadForApp, {
      appId: args.appId,
    })
  },
})

export const listAppMessages = query({
  args: {
    appId: v.id("apps"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { app } = await requireAppMember(ctx, args.appId)
    if (!app.threadId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      }
    }

    return await listUIMessages(ctx, components.agent, {
      threadId: app.threadId,
      paginationOpts: args.paginationOpts,
    })
  },
})

export const saveUserMessage = internalMutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    prompt: v.string(),
  },
  returns: v.object({
    messageId: v.string(),
  }),
  handler: async (ctx, args) => {
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: args.userId,
      prompt: args.prompt,
    })
    return { messageId }
  },
})

export const saveAssistantProgress = internalMutation({
  args: {
    threadId: v.string(),
    text: v.string(),
    agentName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      agentName: args.agentName ?? "SolBuilder",
      prompt: args.text,
    })
    return null
  },
})

export const writeProgressForStep = internalMutation({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    status: v.string(),
    customMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId)
    const job = await ctx.db.get(args.jobId)
    if (!app?.threadId || !job) {
      return null
    }

    const text =
      args.customMessage ??
      PROGRESS_MESSAGES[args.status as GenerationStatus] ??
      null

    if (!text) {
      return null
    }

    if (job.lastProgressMessage === text) {
      return null
    }

    await saveMessage(ctx, components.agent, {
      threadId: app.threadId,
      agentName: "SolBuilder",
      prompt: text,
    })

    await ctx.db.patch(args.jobId, {
      lastProgressMessage: text,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const writeFinalMessage = internalMutation({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    ok: v.boolean(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId)
    if (!app?.threadId) {
      return null
    }

    await saveMessage(ctx, components.agent, {
      threadId: app.threadId,
      agentName: "SolBuilder",
      prompt: args.text,
    })

    await ctx.db.patch(args.jobId, {
      lastProgressMessage: args.text,
      updatedAt: Date.now(),
    })

    return null
  },
})

/** Health check for authenticated thread access without side effects. */
export const hasThreadAccess = query({
  args: { appId: v.id("apps") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireIdentity(ctx)
    try {
      await requireAppMember(ctx, args.appId)
      return true
    } catch {
      return false
    }
  },
})
