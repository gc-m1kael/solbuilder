import { v } from "convex/values"
import { internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { workflow } from "./workflow"

type SendResult = {
  jobId: Id<"generationJobs">
  workflowId: string
  threadId: string
  promptMessageId: string
}

/** Internal helper used by retryGeneration to start a fresh job + workflow. */
export const startRetryJob = internalMutation({
  args: {
    appId: v.id("apps"),
    userId: v.string(),
    prompt: v.string(),
    threadId: v.optional(v.string()),
  },
  returns: v.object({
    jobId: v.id("generationJobs"),
    workflowId: v.string(),
    threadId: v.string(),
    promptMessageId: v.string(),
  }),
  handler: async (ctx, args): Promise<SendResult> => {
    const threadId: string =
      args.threadId ??
      (await ctx.runMutation(internal.threads.ensureThreadForApp, {
        appId: args.appId,
      }))

    const saved = await ctx.runMutation(internal.threads.saveUserMessage, {
      threadId,
      userId: args.userId,
      prompt: args.prompt,
    })
    const messageId: string = saved.messageId

    const jobId: Id<"generationJobs"> = await ctx.runMutation(
      internal.generationJobs.createJob,
      {
        appId: args.appId,
        userId: args.userId,
        prompt: args.prompt,
        promptMessageId: messageId,
      }
    )

    const workflowId: string = await workflow.start(
      ctx,
      internal.workflow.generateApp.generateAppWorkflow,
      {
        appId: args.appId,
        jobId,
        userId: args.userId,
        prompt: args.prompt,
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
      threadId,
    })

    return {
      jobId,
      workflowId,
      threadId,
      promptMessageId: messageId,
    }
  },
})
