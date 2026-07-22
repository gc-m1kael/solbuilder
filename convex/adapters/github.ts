import { assertNotStub, optionalEnv, requireEnv } from "../lib/env"
import { randomSuffix, withSuffix } from "../lib/slugify"

const GITHUB_API = "https://api.github.com"
const API_VERSION = "2022-11-28"

export type GithubRepoInfo = {
  repositoryUrl: string
  fullName: string
  defaultBranch: string
  repoId: number
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
  }
}

function parseOwnerRepo(input: string): { owner: string; repo: string } {
  const trimmed = input.trim()
  if (trimmed.includes("github.com")) {
    const url = new URL(trimmed)
    const [owner, repoRaw] = url.pathname.replace(/^\/+/, "").split("/")
    const repo = repoRaw?.replace(/\.git$/i, "")
    if (!owner || !repo) {
      throw new Error(`Invalid GitHub repo reference: ${input}`)
    }
    return { owner, repo }
  }

  const [owner, repo] = trimmed.split("/")
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub repo reference: ${input}`)
  }
  return { owner, repo }
}

export function getGithubConfig() {
  return {
    token: requireEnv("GITHUB_TOKEN"),
    owner: requireEnv("GITHUB_OWNER"),
    starterRepo:
      optionalEnv("GITHUB_STARTER_REPO") ?? "gc-m1kael/solbuilder-app-starter",
  }
}

export async function getRepoByFullName(fullName: string): Promise<GithubRepoInfo | null> {
  assertNotStub("GitHub")
  const { token } = getGithubConfig()
  const res = await fetch(`${GITHUB_API}/repos/${fullName}`, {
    headers: githubHeaders(token),
  })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub get repo failed (${res.status}): ${text}`)
  }
  const data = (await res.json()) as {
    id: number
    html_url: string
    full_name: string
    default_branch: string
  }
  return {
    repositoryUrl: data.html_url,
    fullName: data.full_name,
    defaultBranch: data.default_branch,
    repoId: data.id,
  }
}

/**
 * Idempotent: if `existingFullName` is set and exists, reuse it.
 * Otherwise generate from the starter template.
 */
export async function ensureRepoFromStarter(args: {
  targetRepoName: string
  existingFullName?: string | null
  privateRepo?: boolean
}): Promise<GithubRepoInfo> {
  assertNotStub("GitHub")
  const { token, owner, starterRepo } = getGithubConfig()

  if (args.existingFullName) {
    const existing = await getRepoByFullName(args.existingFullName)
    if (existing) {
      return existing
    }
  }

  const template = parseOwnerRepo(starterRepo)
  const headers = githubHeaders(token)
  const baseName = args.targetRepoName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 ? baseName : withSuffix(baseName, randomSuffix(4), 95)

    const res = await fetch(
      `${GITHUB_API}/repos/${template.owner}/${template.repo}/generate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          owner,
          name: candidate,
          private: args.privateRepo ?? true,
        }),
      }
    )

    if (res.ok || res.status === 201) {
      // Generate API may return 201 with empty/minimal body; fetch the repo next.
      const fullName = `${owner}/${candidate}`
      for (let poll = 0; poll < 10; poll++) {
        const created = await getRepoByFullName(fullName)
        if (created) {
          return created
        }
        await new Promise((r) => setTimeout(r, 500 * (poll + 1)))
      }
      return {
        repositoryUrl: `https://github.com/${fullName}`,
        fullName,
        defaultBranch: "main",
        repoId: 0,
      }
    }

    const text = await res.text()
    lastError = new Error(`GitHub generate failed (${res.status}): ${text}`)
    const nameCollision =
      res.status === 422 &&
      (text.includes("Name already exists") || text.includes("name already exists"))
    if (!nameCollision) {
      throw lastError
    }
  }

  throw lastError ?? new Error("GitHub generate failed")
}

export async function getHeadSha(args: {
  fullName: string
  branch: string
}): Promise<string> {
  assertNotStub("GitHub")
  const { token } = getGithubConfig()
  const res = await fetch(
    `${GITHUB_API}/repos/${args.fullName}/commits/${encodeURIComponent(args.branch)}`,
    { headers: githubHeaders(token) }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub get HEAD failed (${res.status}): ${text}`)
  }
  const data = (await res.json()) as { sha: string }
  return data.sha
}
