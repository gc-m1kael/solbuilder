import { v } from "convex/values"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { requireAppMember } from "./lib/auth"
import { isActiveStatus, generationStatusValidator } from "./lib/status"
import { workflow } from "./workflow"

type SendResult = {
  jobId: Id<"generationJobs">
  workflowId: string
  threadId: string
  promptMessageId: string
}

export const sendAppMessage = mutation({
  args: {
    appId: v.id("apps"),
    prompt: v.string(),
  },
  returns: v.object({
    jobId: v.id("generationJobs"),
    workflowId: v.string(),
    threadId: v.string(),
    promptMessageId: v.string(),
  }),
  handler: async (ctx, args): Promise<SendResult> => {
    const { identity, app } = await requireAppMember(ctx, args.appId)
    const prompt = args.prompt.trim()
    if (!prompt) {
      throw new Error("Prompt is required")
    }

    const active = await ctx.runQuery(internal.generationJobs.findActiveJobForApp, {
      appId: args.appId,
    })
    if (active && isActiveStatus(active.status)) {
      throw new Error(
        "A generation job is already running for this app. Wait for it to finish or retry after failure."
      )
    }

    const threadId: string = await ctx.runMutation(
      internal.threads.ensureThreadForApp,
      { appId: args.appId }
    )

    const saved = await ctx.runMutation(internal.threads.saveUserMessage, {
      threadId,
      userId: identity.subject,
      prompt,
    })
    const messageId: string = saved.messageId

    const jobId: Id<"generationJobs"> = await ctx.runMutation(
      internal.generationJobs.createJob,
      {
        appId: args.appId,
        userId: identity.subject,
        prompt,
        promptMessageId: messageId,
      }
    )

    const workflowId: string = await workflow.start(
      ctx,
      internal.workflow.generateApp.generateAppWorkflow,
      {
        appId: args.appId,
        jobId,
        userId: identity.subject,
        prompt,
      },
      {
        startAsync: true,
        onComplete: internal.generationJobs.handleWorkflowComplete,
        context: { jobId },
      }
    )

    await ctx.runMutation(internal.generationJobs.attachWorkflowId, {
      jobId,
      workflowId,
    })

    await ctx.db.patch(args.appId, {
      updatedAt: Date.now(),
      threadId: app.threadId ?? threadId,
    })

    return {
      jobId,
      workflowId,
      threadId,
      promptMessageId: messageId,
    }
  },
})

export const getGenerationStatus = query({
  args: {
    appId: v.id("apps"),
    jobId: v.optional(v.id("generationJobs")),
  },
  returns: v.union(
    v.null(),
    v.object({
      jobId: v.id("generationJobs"),
      status: generationStatusValidator,
      currentStep: v.string(),
      error: v.optional(v.string()),
      workflowId: v.optional(v.string()),
      cursorAgentId: v.optional(v.string()),
      githubRepoUrl: v.optional(v.string()),
      vercelProjectId: v.optional(v.string()),
      vercelDeploymentId: v.optional(v.string()),
      generatedConvexProjectId: v.optional(v.string()),
      lastProgressMessage: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      finishedAt: v.optional(v.number()),
      app: v.object({
        status: generationStatusValidator,
        vercelDeploymentUrl: v.optional(v.string()),
        generatedConvexDeploymentUrl: v.optional(v.string()),
        githubRepoUrl: v.optional(v.string()),
        lastError: v.optional(v.string()),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const { app } = await requireAppMember(ctx, args.appId)

    let job = null
    if (args.jobId) {
      job = await ctx.db.get(args.jobId)
      if (!job || job.appId !== args.appId) {
        return null
      }
    } else if (app.activeJobId) {
      job = await ctx.db.get(app.activeJobId)
    } else {
      job = await ctx.db
        .query("generationJobs")
        .withIndex("by_app_created", (q) => q.eq("appId", args.appId))
        .order("desc")
        .first()
    }

    if (!job) {
      return null
    }

    return {
      jobId: job._id,
      status: job.status,
      currentStep: job.currentStep,
      error: job.error,
      workflowId: job.workflowId,
      cursorAgentId: job.cursorAgentId,
      githubRepoUrl: job.githubRepoUrl,
      vercelProjectId: job.vercelProjectId,
      vercelDeploymentId: job.vercelDeploymentId,
      generatedConvexProjectId: job.generatedConvexProjectId,
      lastProgressMessage: job.lastProgressMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      finishedAt: job.finishedAt,
      app: {
        status: app.status,
        vercelDeploymentUrl: app.vercelDeploymentUrl,
        generatedConvexDeploymentUrl: app.generatedConvexDeploymentUrl,
        githubRepoUrl: app.githubRepoUrl,
        lastError: app.lastError,
      },
    }
  },
})

export const retryGeneration = mutation({
  args: {
    appId: v.id("apps"),
    jobId: v.optional(v.id("generationJobs")),
  },
  returns: v.object({
    jobId: v.id("generationJobs"),
    workflowId: v.string(),
    threadId: v.string(),
    promptMessageId: v.string(),
  }),
  handler: async (ctx, args): Promise<SendResult> => {
    const { identity, app } = await requireAppMember(ctx, args.appId)

    const active = await ctx.runQuery(internal.generationJobs.findActiveJobForApp, {
      appId: args.appId,
    })
    if (active && isActiveStatus(active.status)) {
      throw new Error("Cannot retry while a generation job is still active")
    }

    let sourceJob = null
    if (args.jobId) {
      sourceJob = await ctx.db.get(args.jobId)
    } else {
      sourceJob = await ctx.db
        .query("generationJobs")
        .withIndex("by_app_created", (q) => q.eq("appId", args.appId))
        .order("desc")
        .first()
    }

    if (!sourceJob || sourceJob.appId !== args.appId) {
      throw new Error("No previous generation job to retry")
    }
    if (sourceJob.status !== "failed") {
      throw new Error("Only failed generation jobs can be retried")
    }

    return await ctx.runMutation(internal.generationInternal.startRetryJob, {
      appId: args.appId,
      userId: identity.subject,
      prompt: sourceJob.prompt,
      threadId: app.threadId,
    })
  },
})
