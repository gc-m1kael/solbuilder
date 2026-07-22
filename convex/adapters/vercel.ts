import { assertNotStub, optionalEnv, requireEnv } from "../lib/env"
import { randomSuffix, withSuffix } from "../lib/slugify"

const VERCEL_API = "https://api.vercel.com"

export type VercelProjectInfo = {
  projectId: string
  projectName: string
  framework?: string | null
}

export type VercelDeploymentInfo = {
  deploymentId: string
  url: string
  readyState: string
  createdAt?: number
}

function getVercelConfig() {
  return {
    token: requireEnv("VERCEL_TOKEN"),
    teamId: optionalEnv("VERCEL_TEAM_ID"),
  }
}

async function vercelRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  assertNotStub("Vercel")
  const { token, teamId } = getVercelConfig()
  const url = new URL(`${VERCEL_API}${path}`)
  if (teamId) {
    url.searchParams.set("teamId", teamId)
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Vercel API ${method} ${path} failed (${res.status}): ${text || res.statusText}`)
  }

  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export async function getProject(projectId: string): Promise<VercelProjectInfo | null> {
  try {
    const project = await vercelRequest<{ id: string; name: string; framework?: string | null }>(
      "GET",
      `/v9/projects/${projectId}`
    )
    return {
      projectId: project.id,
      projectName: project.name,
      framework: project.framework,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("(404)")) {
      return null
    }
    throw err
  }
}

/**
 * Idempotent: reuse existingProjectId when present; otherwise create linked to GitHub.
 */
export async function ensureProject(args: {
  projectName: string
  githubFullName: string
  existingProjectId?: string | null
}): Promise<VercelProjectInfo> {
  if (args.existingProjectId) {
    const existing = await getProject(args.existingProjectId)
    if (existing) {
      await disableDeploymentProtection(existing.projectId)
      return existing
    }
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const name =
      attempt === 0
        ? args.projectName
        : withSuffix(args.projectName, randomSuffix(4), 100)

    try {
      const created = await vercelRequest<{ id: string; name: string; framework?: string | null }>(
        "POST",
        "/v9/projects",
        {
          name,
          gitRepository: {
            type: "github",
            repo: args.githubFullName,
          },
        }
      )
      await disableDeploymentProtection(created.id)
      return {
        projectId: created.id,
        projectName: created.name,
        framework: created.framework,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const message = lastError.message
      const collision =
        message.includes("project name") ||
        message.includes("already exists") ||
        message.includes("409") ||
        message.includes("400")
      if (!collision || attempt === 4) {
        throw lastError
      }
    }
  }

  throw lastError ?? new Error("Vercel project creation failed")
}

async function disableDeploymentProtection(projectId: string): Promise<void> {
  try {
    await vercelRequest("PATCH", `/v9/projects/${projectId}`, {
      ssoProtection: null,
      trustedIps: null,
      passwordProtection: null,
    })
  } catch {
    try {
      await vercelRequest("PATCH", `/v9/projects/${projectId}`, {
        ssoProtection: null,
      })
    } catch {
      // Best effort only.
    }
  }
}

export async function upsertEnvVars(args: {
  projectId: string
  vars: Array<{ key: string; value: string }>
}): Promise<void> {
  const existing = await vercelRequest<{
    envs: Array<{ id: string; key: string }>
  }>("GET", `/v10/projects/${args.projectId}/env`)

  for (const envVar of args.vars) {
    const found = existing.envs.find((e) => e.key === envVar.key)
    if (found) {
      await vercelRequest("PATCH", `/v10/projects/${args.projectId}/env/${found.id}`, {
        value: envVar.value,
        target: ["production", "preview", "development"],
        type: "encrypted",
      })
    } else {
      await vercelRequest("POST", `/v10/projects/${args.projectId}/env`, {
        key: envVar.key,
        value: envVar.value,
        target: ["production", "preview", "development"],
        type: "encrypted",
      })
    }
  }
}

export async function listRecentDeployments(args: {
  projectId: string
  limit?: number
}): Promise<VercelDeploymentInfo[]> {
  const limit = args.limit ?? 10
  const response = await vercelRequest<{
    deployments: Array<{
      uid?: string
      id?: string
      url?: string
      readyState?: string
      state?: string
      created?: number
      createdAt?: number
    }>
  }>("GET", `/v6/deployments?projectId=${args.projectId}&limit=${limit}`)

  return (response.deployments ?? []).map((d) => ({
    deploymentId: d.uid ?? d.id ?? "",
    url: d.url ? `https://${d.url}` : "",
    readyState: d.readyState ?? d.state ?? "UNKNOWN",
    createdAt: d.createdAt ?? d.created,
  }))
}

export async function waitForReadyDeployment(args: {
  projectId: string
  sinceMs?: number
  maxAttempts?: number
  delayMs?: number
}): Promise<VercelDeploymentInfo> {
  const maxAttempts = args.maxAttempts ?? 40
  const delayMs = args.delayMs ?? 5000
  const sinceMs = args.sinceMs ?? Date.now() - 60_000

  let last: VercelDeploymentInfo | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const deployments = await listRecentDeployments({
      projectId: args.projectId,
      limit: 15,
    })
    const candidates = deployments.filter(
      (d) => !d.createdAt || d.createdAt >= sinceMs - 5 * 60_000
    )
    const ready = candidates.find((d) => d.readyState === "READY")
    if (ready) {
      return ready
    }
    const errored = candidates.find(
      (d) => d.readyState === "ERROR" || d.readyState === "CANCELED"
    )
    if (errored) {
      throw new Error(`Vercel deployment ${errored.readyState}: ${errored.deploymentId}`)
    }
    last = candidates[0] ?? deployments[0] ?? null
    await new Promise((r) => setTimeout(r, delayMs))
  }

  throw new Error(
    `Timed out waiting for Vercel deployment${last ? ` (last=${last.readyState})` : ""}`
  )
}

export function stableProductionUrl(projectName: string): string {
  return `https://${projectName}.vercel.app`
}
