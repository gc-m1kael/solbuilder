"use node"

import { v } from "convex/values"
import { internalAction } from "../_generated/server"
import { internal } from "../_generated/api"
import * as github from "../adapters/github"
import * as convexPlatform from "../adapters/convexPlatform"
import * as vercel from "../adapters/vercel"
import * as cursor from "../adapters/cursor"
import { optionalEnv } from "../lib/env"

export const ensureGithubRepo = internalAction({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
  },
  returns: v.object({
    repositoryUrl: v.string(),
    fullName: v.string(),
    defaultBranch: v.string(),
  }),
  handler: async (ctx, args) => {
    const app = await ctx.runQuery(internal.generationJobs.getApp, {
      appId: args.appId,
    })
    if (!app) {
      throw new Error("App not found")
    }

    const repo = await github.ensureRepoFromStarter({
      targetRepoName: app.slug,
      existingFullName: app.githubRepoFullName,
      privateRepo: true,
    })

    await ctx.runMutation(internal.generationJobs.saveGithubOnApp, {
      appId: args.appId,
      jobId: args.jobId,
      githubRepoUrl: repo.repositoryUrl,
      githubRepoFullName: repo.fullName,
      githubDefaultBranch: repo.defaultBranch,
    })

    // Wait briefly for GitHub to materialize the default branch.
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        await github.getHeadSha({
          fullName: repo.fullName,
          branch: repo.defaultBranch,
        })
        break
      } catch {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }

    return {
      repositoryUrl: repo.repositoryUrl,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
    }
  },
})

export const ensureConvexProject = internalAction({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
  },
  returns: v.object({
    projectId: v.string(),
    projectSlug: v.string(),
    deploymentName: v.string(),
    deploymentUrl: v.string(),
    deployKey: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const app = await ctx.runQuery(internal.generationJobs.getApp, {
      appId: args.appId,
    })
    if (!app) {
      throw new Error("App not found")
    }

    const project = await convexPlatform.ensureProdProject({
      projectName: app.slug,
      existingProjectId: app.generatedConvexProjectId,
      existingDeploymentName: app.generatedConvexDeploymentName,
      existingDeploymentUrl: app.generatedConvexDeploymentUrl,
      existingProjectSlug: app.generatedConvexProjectSlug,
    })

    await ctx.runMutation(internal.generationJobs.saveConvexOnApp, {
      appId: args.appId,
      jobId: args.jobId,
      generatedConvexProjectId: project.projectId,
      generatedConvexProjectSlug: project.projectSlug,
      generatedConvexDeploymentName: project.deploymentName,
      generatedConvexDeploymentUrl: project.deploymentUrl,
    })

    return {
      projectId: project.projectId,
      projectSlug: project.projectSlug,
      deploymentName: project.deploymentName,
      deploymentUrl: project.deploymentUrl,
      deployKey: project.deployKey,
    }
  },
})

export const ensureVercelProject = internalAction({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
  },
  returns: v.object({
    projectId: v.string(),
    projectName: v.string(),
  }),
  handler: async (ctx, args) => {
    const app = await ctx.runQuery(internal.generationJobs.getApp, {
      appId: args.appId,
    })
    if (!app) {
      throw new Error("App not found")
    }
    if (!app.githubRepoFullName) {
      throw new Error("GitHub repository must exist before creating Vercel project")
    }

    const project = await vercel.ensureProject({
      projectName: app.slug,
      githubFullName: app.githubRepoFullName,
      existingProjectId: app.vercelProjectId,
    })

    await ctx.runMutation(internal.generationJobs.saveVercelOnApp, {
      appId: args.appId,
      jobId: args.jobId,
      vercelProjectId: project.projectId,
      vercelProjectName: project.projectName,
    })

    return {
      projectId: project.projectId,
      projectName: project.projectName,
    }
  },
})

export const configureEnvironment = internalAction({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    deployKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const app = await ctx.runQuery(internal.generationJobs.getApp, {
      appId: args.appId,
    })
    if (!app) {
      throw new Error("App not found")
    }
    if (!app.vercelProjectId) {
      throw new Error("Vercel project required before configuring environment")
    }
    if (!app.generatedConvexDeploymentUrl) {
      throw new Error("Convex deployment URL required before configuring environment")
    }

    const vars: Array<{ key: string; value: string }> = [
      { key: "VITE_CONVEX_URL", value: app.generatedConvexDeploymentUrl },
      { key: "VITE_SOLBUILDER_APP_ID", value: args.appId },
    ]

    if (args.deployKey) {
      vars.push({ key: "CONVEX_DEPLOY_KEY", value: args.deployKey })
    }

    const siteUrl = optionalEnv("CONVEX_SITE_URL")
    if (siteUrl) {
      vars.push({ key: "VITE_SOLBUILDER_HOST_URL", value: siteUrl })
    }

    await vercel.upsertEnvVars({
      projectId: app.vercelProjectId,
      vars,
    })

    return null
  },
})

export const startCursorAgent = internalAction({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    prompt: v.string(),
  },
  returns: v.object({
    agentId: v.string(),
    status: v.string(),
    branchName: v.optional(v.string()),
    startedAtMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const app = await ctx.runQuery(internal.generationJobs.getApp, {
      appId: args.appId,
    })
    if (!app) {
      throw new Error("App not found")
    }
    if (!app.githubRepoUrl) {
      throw new Error("GitHub repository required before starting Cursor")
    }

    const text = cursor.buildCursorPrompt({
      userPrompt: args.prompt,
      appName: app.name,
    })

    const siteUrl = optionalEnv("CONVEX_SITE_URL")
    const webhookSecret = optionalEnv("CURSOR_WEBHOOK_SECRET")

    const agent = await cursor.startAgent({
      prompt: text,
      repositoryUrl: app.githubRepoUrl,
      sourceRef: app.githubDefaultBranch ?? "main",
      webhookUrl: siteUrl ? `${siteUrl.replace(/\/$/, "")}/cursor-webhook` : undefined,
      webhookSecret,
    })

    await ctx.runMutation(internal.generationJobs.saveCursorAgentId, {
      appId: args.appId,
      jobId: args.jobId,
      cursorAgentId: agent.id,
    })

    return {
      agentId: agent.id,
      status: agent.status,
      branchName: agent.target?.branchName,
      // Recorded so the deploy wait only matches deployments created after
      // Cursor started (never the stale starter-push deployment).
      startedAtMs: Date.now(),
    }
  },
})

export const pollCursorAgent = internalAction({
  args: {
    agentId: v.string(),
    appId: v.id("apps"),
    seenMessageIds: v.array(v.string()),
  },
  returns: v.object({
    status: v.string(),
    summary: v.optional(v.string()),
    terminal: v.boolean(),
    success: v.boolean(),
    newMessages: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const status = await cursor.getAgentStatus(args.agentId)
    const conversation = await cursor.getAgentConversation(args.agentId)
    const seen = new Set(args.seenMessageIds)
    const meaningful = cursor.pickMeaningfulAssistantMessages(conversation, seen)

    const app = await ctx.runQuery(internal.generationJobs.getApp, {
      appId: args.appId,
    })

    if (app?.threadId) {
      for (const message of meaningful) {
        const clipped =
          message.text.length > 1200
            ? `${message.text.slice(0, 1200)}…`
            : message.text
        await ctx.runMutation(internal.threads.saveAssistantProgress, {
          threadId: app.threadId,
          text: clipped,
          agentName: "Cursor",
        })
      }
    }

    return {
      status: status.status,
      summary: status.summary,
      terminal: cursor.isCursorTerminal(status.status),
      success: cursor.isCursorSuccess(status.status),
      newMessages: meaningful.map((m) => ({ id: m.id, text: m.text })),
    }
  },
})

export const waitForVercelDeployment = internalAction({
  args: {
    appId: v.id("apps"),
    jobId: v.id("generationJobs"),
    sinceMs: v.number(),
  },
  returns: v.object({
    deploymentId: v.string(),
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<{ deploymentId: string; url: string }> => {
    const app = await ctx.runQuery(internal.generationJobs.getApp, {
      appId: args.appId,
    })
    if (!app?.vercelProjectId || !app.vercelProjectName) {
      throw new Error("Vercel project required before waiting for deployment")
    }

    const deployment = await vercel.waitForReadyDeployment({
      projectId: app.vercelProjectId,
      sinceMs: args.sinceMs,
      maxAttempts: 36,
      delayMs: 5000,
    })

    const url: string =
      deployment.url || vercel.stableProductionUrl(app.vercelProjectName)

    await ctx.runMutation(internal.generationJobs.saveFinalUrls, {
      appId: args.appId,
      jobId: args.jobId,
      vercelDeploymentUrl: url,
      vercelDeploymentId: deployment.deploymentId,
      generatedConvexDeploymentUrl: app.generatedConvexDeploymentUrl,
    })

    return {
      deploymentId: deployment.deploymentId,
      url,
    }
  },
})
