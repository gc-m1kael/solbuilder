export type SolBuilderBridgeUser = {
  id: string
  name: string
  avatarUrl: string | null
}

export type SolBuilderBridgeMember = {
  name: string
  initials: string
}

export type SolBuilderContextPayload = {
  appId: string
  user: SolBuilderBridgeUser
  walletAddress: string | null
  members: SolBuilderBridgeMember[]
}

export type SolBuilderAppReadyMessage = {
  type: "SOLBUILDER_APP_READY"
}

export type SolBuilderContextMessage = {
  type: "SOLBUILDER_CONTEXT"
  payload: SolBuilderContextPayload
}

export type SolBuilderAppToHostMessage = SolBuilderAppReadyMessage
export type SolBuilderHostToAppMessage = SolBuilderContextMessage

export function isSolBuilderAppReadyMessage(
  value: unknown
): value is SolBuilderAppReadyMessage {
  if (!value || typeof value !== "object") {
    return false
  }

  return (value as { type?: unknown }).type === "SOLBUILDER_APP_READY"
}
