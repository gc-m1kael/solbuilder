"use node"

import { createSign } from "crypto"
import { assertNotStub, optionalEnv, requireEnv } from "../lib/env"
import { randomSuffix, withSuffix } from "../lib/slugify"

const GITHUB_API = "https://api.github.com"
const API_VERSION = "2022-11-28"

// --- GitHub App installation auth (preferred when configured) ---
// Repos must be created via the GitHub App installation so the Cursor
// integration (connected to the same installation's org) can access them.

let cachedInstallationToken: { token: string; expiresAtMs: number } | null =
  null

function createAppJwt(appId: string, privateKeyPem: string): string {
  const b64url = (input: string | Buffer) =>
    Buffer.from(input).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const payload = b64url(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId })
  )
  const signer = createSign("RSA-SHA256")
  signer.update(`${header}.${payload}`)
  const signature = signer.sign(privateKeyPem).toString("base64url")
  return `${header}.${payload}.${signature}`
}

async function getInstallationToken(): Promise<string | null> {
  const appId = optionalEnv("GITHUB_APP_ID")
  const installationId = optionalEnv("GITHUB_APP_INSTALLATION_ID")
  const privateKeyB64 = optionalEnv("GITHUB_APP_PRIVATE_KEY_B64")
  if (!appId || !installationId || !privateKeyB64) {
    return null
  }

  if (
    cachedInstallationToken &&
    cachedInstallationToken.expiresAtMs - Date.now() > 60_000
  ) {
    return cachedInstallationToken.token
  }

  const pem = Buffer.from(privateKeyB64, "base64")
    .toString("utf8")
    .replace(/\\n/g, "\n")
  const jwt = createAppJwt(appId, pem)
  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION,
      },
      body: JSON.stringify({
        permissions: {
          administration: "write",
          contents: "write",
          pull_requests: "write",
        },
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `GitHub App installation token failed (${res.status}): ${text}`
    )
  }
  const data = (await res.json()) as { token?: string; expires_at?: string }
  if (!data.token || !data.expires_at) {
    throw new Error("GitHub App installation token response missing token")
  }
  cachedInstallationToken = {
    token: data.token,
    expiresAtMs: new Date(data.expires_at).getTime(),
  }
  return data.token
}

async function getGithubToken(): Promise<string> {
  const installationToken = await getInstallationToken()
  if (installationToken) {
    return installationToken
  }
  return requireEnv("GITHUB_TOKEN")
}

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
    owner: requireEnv("GITHUB_OWNER"),
    starterRepo:
      optionalEnv("GITHUB_STARTER_REPO") ?? "gc-m1kael/solbuilder-app-starter",
  }
}

export async function getRepoByFullName(fullName: string): Promise<GithubRepoInfo | null> {
  assertNotStub("GitHub")
  const token = await getGithubToken()
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
  const { owner, starterRepo } = getGithubConfig()
  const token = await getGithubToken()

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
  const token = await getGithubToken()
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
