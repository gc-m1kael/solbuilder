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

export type SolBuilderSolTransferRequestPayload = {
  requestId: string
  recipient: string
  amountSol: number
}

export type SolBuilderSolTransferRequestMessage = {
  type: "SOLBUILDER_SOL_TRANSFER_REQUEST"
  payload: SolBuilderSolTransferRequestPayload
}

export type SolBuilderSolTransferResultStatus =
  | "success"
  | "error"
  | "cancelled"

export type SolBuilderSolTransferResultPayload = {
  requestId: string
  status: SolBuilderSolTransferResultStatus
  signature?: string
  error?: string
}

export type SolBuilderSolTransferResultMessage = {
  type: "SOLBUILDER_SOL_TRANSFER_RESULT"
  payload: SolBuilderSolTransferResultPayload
}

export type SolBuilderAppToHostMessage =
  | SolBuilderAppReadyMessage
  | SolBuilderSolTransferRequestMessage

export type SolBuilderHostToAppMessage =
  | SolBuilderContextMessage
  | SolBuilderSolTransferResultMessage

export function isSolBuilderAppReadyMessage(
  value: unknown
): value is SolBuilderAppReadyMessage {
  if (!value || typeof value !== "object") {
    return false
  }

  return (value as { type?: unknown }).type === "SOLBUILDER_APP_READY"
}

export function isSolBuilderSolTransferRequestMessage(
  value: unknown
): value is SolBuilderSolTransferRequestMessage {
  if (!value || typeof value !== "object") {
    return false
  }

  const message = value as {
    type?: unknown
    payload?: unknown
  }

  if (message.type !== "SOLBUILDER_SOL_TRANSFER_REQUEST") {
    return false
  }

  if (!message.payload || typeof message.payload !== "object") {
    return false
  }

  const payload = message.payload as {
    requestId?: unknown
    recipient?: unknown
    amountSol?: unknown
  }

  return (
    typeof payload.requestId === "string" &&
    payload.requestId.length > 0 &&
    typeof payload.recipient === "string" &&
    payload.recipient.length > 0 &&
    typeof payload.amountSol === "number" &&
    Number.isFinite(payload.amountSol)
  )
}
