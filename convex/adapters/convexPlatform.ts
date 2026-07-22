import { assertNotStub, optionalEnv, requireEnv } from "../lib/env"
import { randomSuffix, withSuffix } from "../lib/slugify"

const CONVEX_API = "https://api.convex.dev/v1"

export type ConvexProjectInfo = {
  projectId: string
  projectSlug: string
  deploymentName: string
  deploymentUrl: string
  deployKey?: string
}

function getConvexTeamToken(): string {
  return requireEnv("CONVEX_TEAM_TOKEN")
}

function getConvexTeamId(): string {
  const teamId = optionalEnv("CONVEX_TEAM_ID")
  if (teamId) {
    return teamId
  }
  throw new Error(
    "CONVEX_TEAM_ID must be set (Convex Management API requires a team id; CONVEX_TEAM_SLUG alone is not enough)"
  )
}

async function managementRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  assertNotStub("Convex Platform")
  const token = getConvexTeamToken()
  const res = await fetch(`${CONVEX_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Convex Management API ${method} ${path} failed (${res.status}): ${text || res.statusText}`
    )
  }

  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

/**
 * Idempotent create: if existing IDs are provided, reuse and optionally mint a new deploy key.
 */
export async function ensureProdProject(args: {
  projectName: string
  existingProjectId?: string | null
  existingDeploymentName?: string | null
  existingDeploymentUrl?: string | null
  existingProjectSlug?: string | null
}): Promise<ConvexProjectInfo> {
  if (
    args.existingProjectId &&
    args.existingDeploymentName &&
    args.existingDeploymentUrl
  ) {
    const deployKey = await createDeployKey(args.existingDeploymentName)
    return {
      projectId: args.existingProjectId,
      projectSlug: args.existingProjectSlug ?? args.projectName,
      deploymentName: args.existingDeploymentName,
      deploymentUrl: args.existingDeploymentUrl,
      deployKey,
    }
  }

  const teamId = getConvexTeamId()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const projectName =
      attempt === 0
        ? args.projectName
        : withSuffix(args.projectName, randomSuffix(4), 64)

    try {
      const response = await managementRequest<{
        projectId: number
        projectSlug?: string
        deploymentName: string
        deploymentUrl: string
      }>("POST", `/teams/${teamId}/create_project`, {
        projectName,
        deploymentType: "prod",
      })

      const deployKey = await createDeployKey(response.deploymentName)
      return {
        projectId: String(response.projectId),
        // The management API does not always echo a slug back.
        projectSlug: response.projectSlug ?? projectName,
        deploymentName: response.deploymentName,
        deploymentUrl: response.deploymentUrl,
        deployKey,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const collision =
        lastError.message.includes("already") ||
        lastError.message.includes("409") ||
        lastError.message.includes("400")
      if (!collision || attempt === 4) {
        throw lastError
      }
    }
  }

  throw lastError ?? new Error("Convex project creation failed")
}

export async function createDeployKey(deploymentName: string): Promise<string> {
  const response = await managementRequest<{ key?: string; deployKey?: string }>(
    "POST",
    `/deployments/${deploymentName}/create_deploy_key`,
    {
      name: `solbuilder-${Date.now()}`,
    }
  )
  const key = response.deployKey ?? response.key
  if (!key) {
    throw new Error("Convex create_deploy_key returned no key")
  }
  return key
}
