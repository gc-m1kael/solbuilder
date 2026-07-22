export class MissingEnvError extends Error {
  readonly code = "MISSING_ENV"
  readonly variable: string

  constructor(variable: string) {
    super(`${variable} must be set in Convex environment variables`)
    this.name = "MissingEnvError"
    this.variable = variable
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new MissingEnvError(name)
  }
  return value
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

/** Explicit non-production stub mode. Never pretends provisioning succeeded. */
export function isAdapterStubMode(): boolean {
  return process.env.SOLBUILDER_ADAPTER_MODE?.trim().toLowerCase() === "stub"
}

export function assertNotStub(adapterName: string): void {
  if (isAdapterStubMode()) {
    throw new Error(
      `[STUB] ${adapterName} adapter is in SOLBUILDER_ADAPTER_MODE=stub; real provisioning is disabled`
    )
  }
}
