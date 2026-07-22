import { v } from "convex/values"
import { internal } from "../_generated/api"
import { workflow } from "./index"

const CURSOR_POLL_INTERVAL_MS = 30_000
const CURSOR_MAX_POLLS = 90 // ~45 minutes
const DEPLOY_SETTLE_MS = 15_000

export const generateAppWorkflow = workflow.define({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    userId: v.string(),
    prompt: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    vercelDeploymentUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (step, args): Promise<{
    ok: boolean
    vercelDeploymentUrl?: string
    error?: string
  }> => {
    try {
      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "preparing_repository",
        currentStep: "preparing_repository",
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "preparing_repository",
      })

      await step.runAction(internal.actions.provision.ensureGithubRepo, {
        appId: args.appId,
        jobId: args.jobId,
      })

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "creating_convex",
        currentStep: "creating_convex",
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "creating_convex",
      })

      const convexProject = await step.runAction(
        internal.actions.provision.ensureConvexProject,
        {
          appId: args.appId,
          jobId: args.jobId,
        }
      )

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "creating_vercel",
        currentStep: "creating_vercel",
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "creating_vercel",
      })

      await step.runAction(internal.actions.provision.ensureVercelProject, {
        appId: args.appId,
        jobId: args.jobId,
      })

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "configuring_environment",
        currentStep: "configuring_environment",
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "configuring_environment",
      })

      await step.runAction(internal.actions.provision.configureEnvironment, {
        appId: args.appId,
        jobId: args.jobId,
        deployKey: convexProject.deployKey,
      })

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "starting_cursor",
        currentStep: "starting_cursor",
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "starting_cursor",
      })

      const started = await step.runAction(
        internal.actions.provision.startCursorAgent,
        {
          appId: args.appId,
          jobId: args.jobId,
          prompt: args.prompt,
        }
      )

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "cursor_running",
        currentStep: "cursor_running",
        cursorAgentId: started.agentId,
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "cursor_running",
      })

      const seenMessageIds: string[] = []
      let cursorOk = false
      let cursorError: string | undefined

      for (let i = 0; i < CURSOR_MAX_POLLS; i++) {
        if (i > 0) {
          await step.sleep(CURSOR_POLL_INTERVAL_MS)
        }

        const poll = await step.runAction(
          internal.actions.provision.pollCursorAgent,
          {
            agentId: started.agentId,
            appId: args.appId,
            seenMessageIds,
          }
        )

        for (const message of poll.newMessages) {
          seenMessageIds.push(message.id)
        }

        if (poll.terminal) {
          cursorOk = poll.success
          if (!poll.success) {
            cursorError =
              poll.summary ?? `Cursor ended with status ${poll.status}`
          }
          break
        }
      }

      if (!cursorOk) {
        const error = cursorError ?? "Cursor agent timed out"
        await step.runMutation(internal.generationJobs.setStep, {
          jobId: args.jobId,
          status: "failed",
          currentStep: "failed",
          error,
        })
        await step.runMutation(internal.threads.writeFinalMessage, {
          appId: args.appId,
          jobId: args.jobId,
          ok: false,
          text: `Generation failed: ${error}`,
        })
        return { ok: false, error }
      }

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "deploying_convex",
        currentStep: "deploying_convex",
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "deploying_convex",
      })

      await step.sleep(DEPLOY_SETTLE_MS)

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "deploying_vercel",
        currentStep: "deploying_vercel",
      })
      await step.runMutation(internal.threads.writeProgressForStep, {
        appId: args.appId,
        jobId: args.jobId,
        status: "deploying_vercel",
      })

      const deployment = await step.runAction(
        internal.actions.provision.waitForVercelDeployment,
        {
          appId: args.appId,
          jobId: args.jobId,
          sinceMs: Date.now() - 5 * 60_000,
        }
      )

      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "completed",
        currentStep: "completed",
      })

      const finalText = [
        "App deployed successfully.",
        `Preview: ${deployment.url}`,
        convexProject.deploymentUrl
          ? `Backend: ${convexProject.deploymentUrl}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")

      await step.runMutation(internal.threads.writeFinalMessage, {
        appId: args.appId,
        jobId: args.jobId,
        ok: true,
        text: finalText,
      })

      return {
        ok: true,
        vercelDeploymentUrl: deployment.url,
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      await step.runMutation(internal.generationJobs.setStep, {
        jobId: args.jobId,
        status: "failed",
        currentStep: "failed",
        error,
      })
      await step.runMutation(internal.threads.writeFinalMessage, {
        appId: args.appId,
        jobId: args.jobId,
        ok: false,
        text: `Generation failed: ${error}`,
      })
      return { ok: false, error }
    }
  },
})
