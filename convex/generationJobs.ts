import { v } from "convex/values"
import { vWorkflowId } from "@convex-dev/workflow"
import { vResultValidator } from "@convex-dev/workpool"
import { internalMutation, internalQuery } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import {
  generationStatusValidator,
  isTerminalStatus,
  type GenerationStatus,
} from "./lib/status"

export const getJob = internalQuery({
  args: { jobId: v.id("generationJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId)
  },
})

export const getApp = internalQuery({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appId)
  },
})

export const createJob = internalMutation({
  args: {
    appId: v.id("apps"),
    userId: v.string(),
    prompt: v.string(),
    promptMessageId: v.optional(v.string()),
  },
  returns: v.id("generationJobs"),
  handler: async (ctx, args) => {
    const now = Date.now()
    const jobId = await ctx.db.insert("generationJobs", {
      appId: args.appId,
      userId: args.userId,
      prompt: args.prompt,
      status: "queued",
      currentStep: "queued",
      promptMessageId: args.promptMessageId,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(args.appId, {
      activeJobId: jobId,
      status: "queued",
      updatedAt: now,
      lastError: undefined,
    })

    return jobId
  },
})

export const attachWorkflowId = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      throw new Error("Generation job not found")
    }
    const now = Date.now()
    await ctx.db.patch(args.jobId, {
      workflowId: args.workflowId,
      updatedAt: now,
    })
    await ctx.db.patch(job.appId, {
      activeWorkflowId: args.workflowId,
      updatedAt: now,
    })
  },
})

export const setStep = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    status: generationStatusValidator,
    currentStep: v.string(),
    error: v.optional(v.string()),
    lastProgressMessage: v.optional(v.string()),
    cursorAgentId: v.optional(v.string()),
    githubRepoUrl: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    vercelDeploymentId: v.optional(v.string()),
    generatedConvexProjectId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      throw new Error("Generation job not found")
    }

    const now = Date.now()
    const terminal = isTerminalStatus(args.status as GenerationStatus)

    // Only patch fields that are explicitly provided so step updates never
    // wipe values recorded by earlier steps (e.g. cursorAgentId).
    const jobPatch: Partial<Doc<"generationJobs">> = {
      status: args.status,
      currentStep: args.currentStep,
      updatedAt: now,
    }
    if (args.error !== undefined) jobPatch.error = args.error
    if (args.lastProgressMessage !== undefined) {
      jobPatch.lastProgressMessage = args.lastProgressMessage
    }
    if (args.cursorAgentId !== undefined) {
      jobPatch.cursorAgentId = args.cursorAgentId
    }
    if (args.githubRepoUrl !== undefined) {
      jobPatch.githubRepoUrl = args.githubRepoUrl
    }
    if (args.vercelProjectId !== undefined) {
      jobPatch.vercelProjectId = args.vercelProjectId
    }
    if (args.vercelDeploymentId !== undefined) {
      jobPatch.vercelDeploymentId = args.vercelDeploymentId
    }
    if (args.generatedConvexProjectId !== undefined) {
      jobPatch.generatedConvexProjectId = args.generatedConvexProjectId
    }
    if (terminal) jobPatch.finishedAt = now
    await ctx.db.patch(args.jobId, jobPatch)

    const appPatch: Partial<Doc<"apps">> = {
      status: args.status,
      updatedAt: now,
      activeJobId: terminal ? undefined : job._id,
      activeWorkflowId: terminal ? undefined : job.workflowId,
    }
    if (args.error !== undefined) appPatch.lastError = args.error
    if (args.cursorAgentId !== undefined) {
      appPatch.cursorAgentId = args.cursorAgentId
    }
    await ctx.db.patch(job.appId, appPatch)
  },
})

export const saveGithubOnApp = internalMutation({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    githubRepoUrl: v.string(),
    githubRepoFullName: v.string(),
    githubDefaultBranch: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.patch(args.appId, {
      githubRepoUrl: args.githubRepoUrl,
      githubRepoFullName: args.githubRepoFullName,
      githubDefaultBranch: args.githubDefaultBranch,
      updatedAt: now,
    })
    await ctx.db.patch(args.jobId, {
      githubRepoUrl: args.githubRepoUrl,
      updatedAt: now,
    })
  },
})

export const saveConvexOnApp = internalMutation({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    generatedConvexProjectId: v.string(),
    generatedConvexProjectSlug: v.string(),
    generatedConvexDeploymentName: v.string(),
    generatedConvexDeploymentUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.patch(args.appId, {
      generatedConvexProjectId: args.generatedConvexProjectId,
      generatedConvexProjectSlug: args.generatedConvexProjectSlug,
      generatedConvexDeploymentName: args.generatedConvexDeploymentName,
      generatedConvexDeploymentUrl: args.generatedConvexDeploymentUrl,
      updatedAt: now,
    })
    await ctx.db.patch(args.jobId, {
      generatedConvexProjectId: args.generatedConvexProjectId,
      updatedAt: now,
    })
  },
})

export const saveVercelOnApp = internalMutation({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    vercelProjectId: v.string(),
    vercelProjectName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.patch(args.appId, {
      vercelProjectId: args.vercelProjectId,
      vercelProjectName: args.vercelProjectName,
      updatedAt: now,
    })
    await ctx.db.patch(args.jobId, {
      vercelProjectId: args.vercelProjectId,
      updatedAt: now,
    })
  },
})

export const saveCursorAgentId = internalMutation({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    cursorAgentId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.patch(args.appId, {
      cursorAgentId: args.cursorAgentId,
      updatedAt: now,
    })
    await ctx.db.patch(args.jobId, {
      cursorAgentId: args.cursorAgentId,
      updatedAt: now,
    })
  },
})

export const saveFinalUrls = internalMutation({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    vercelDeploymentUrl: v.string(),
    vercelDeploymentId: v.optional(v.string()),
    generatedConvexDeploymentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.patch(args.appId, {
      vercelDeploymentUrl: args.vercelDeploymentUrl,
      generatedConvexDeploymentUrl:
        args.generatedConvexDeploymentUrl ?? undefined,
      updatedAt: now,
    })
    await ctx.db.patch(args.jobId, {
      vercelDeploymentId: args.vercelDeploymentId,
      updatedAt: now,
    })
  },
})

export const findActiveJobForApp = internalQuery({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("generationJobs")
      .withIndex("by_app_created", (q) => q.eq("appId", args.appId))
      .order("desc")
      .take(10)

    return (
      jobs.find(
        (job) => job.status !== "completed" && job.status !== "failed"
      ) ?? null
    )
  },
})

export const handleWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({
      jobId: v.id("generationJobs"),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.context.jobId)
    if (!job) {
      return null
    }
    if (isTerminalStatus(job.status)) {
      return null
    }

    const now = Date.now()
    if (args.result.kind === "success") {
      const returnValue = args.result.returnValue as
        | { ok?: boolean; error?: string }
        | undefined
      if (returnValue && returnValue.ok === false) {
        const error = returnValue.error ?? "Workflow reported failure"
        await ctx.db.patch(job._id, {
          status: "failed",
          currentStep: "failed",
          error,
          updatedAt: now,
          finishedAt: now,
        })
        await ctx.db.patch(job.appId, {
          status: "failed",
          activeJobId: undefined,
          activeWorkflowId: undefined,
          lastError: error,
          updatedAt: now,
        })
        return null
      }

      await ctx.db.patch(job._id, {
        status: "completed",
        currentStep: "completed",
        updatedAt: now,
        finishedAt: now,
      })
      await ctx.db.patch(job.appId, {
        status: "completed",
        activeJobId: undefined,
        activeWorkflowId: undefined,
        updatedAt: now,
        lastError: undefined,
      })
      return null
    }

    const error =
      args.result.kind === "failed"
        ? args.result.error
        : args.result.kind === "canceled"
          ? "Workflow canceled"
          : "Workflow ended without success"

    await ctx.db.patch(job._id, {
      status: "failed",
      currentStep: "failed",
      error,
      updatedAt: now,
      finishedAt: now,
    })
    await ctx.db.patch(job.appId, {
      status: "failed",
      activeJobId: undefined,
      activeWorkflowId: undefined,
      lastError: error,
      updatedAt: now,
    })
    return null
  },
})

export type JobId = Id<"generationJobs">
