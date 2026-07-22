import * as React from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"

import {
  isSolBuilderAppReadyMessage,
  isSolBuilderSolTransferRequestMessage,
  type SolBuilderBridgeMember,
  type SolBuilderBridgeUser,
  type SolBuilderContextMessage,
  type SolBuilderContextPayload,
  type SolBuilderSolTransferResultMessage,
  type SolBuilderSolTransferResultPayload,
} from "@/lib/bridge/messages"
import { getPreviewOrigin } from "@/lib/bridge/origin"
import {
  executeSolTransfer,
  parseRecipientPublicKey,
  validateTransferAmount,
} from "@/lib/bridge/sol-transfer"

export type HostBridgeStatus = "connecting" | "connected" | "error"

export type HostTransferUiStatus =
  | { state: "idle" }
  | { state: "pending"; requestId: string; amountSol: number; recipient: string }
  | {
      state: "success"
      requestId: string
      signature: string
      amountSol: number
    }
  | {
      state: "error" | "cancelled"
      requestId: string
      error: string
      amountSol?: number
    }

type UseHostBridgeArgs = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  appId: string
  user: SolBuilderBridgeUser | null
  walletAddress: string | null
  members: SolBuilderBridgeMember[]
  previewUrl: string
  reloadKey: number
}

export function useHostBridge({
  iframeRef,
  appId,
  user,
  walletAddress,
  members,
  previewUrl,
  reloadKey,
}: UseHostBridgeArgs) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction, signTransaction, connected } =
    useWallet()
  const [status, setStatus] = React.useState<HostBridgeStatus>("connecting")
  const [transferStatus, setTransferStatus] =
    React.useState<HostTransferUiStatus>({ state: "idle" })
  const appReadyRef = React.useRef(false)
  const transferInFlightRef = React.useRef(false)
  const userRef = React.useRef(user)
  const walletRef = React.useRef({
    publicKey,
    sendTransaction,
    signTransaction,
    connected,
    walletAddress,
  })

  const targetOrigin = React.useMemo(
    () => getPreviewOrigin(previewUrl),
    [previewUrl]
  )

  React.useEffect(() => {
    userRef.current = user
  }, [user])

  React.useEffect(() => {
    walletRef.current = {
      publicKey,
      sendTransaction,
      signTransaction,
      connected,
      walletAddress,
    }
  }, [publicKey, sendTransaction, signTransaction, connected, walletAddress])

  const contextPayload = React.useMemo<SolBuilderContextPayload | null>(() => {
    if (!user) {
      return null
    }

    return {
      appId,
      user,
      walletAddress,
      members,
    }
  }, [appId, user, walletAddress, members])

  const postToIframe = React.useCallback(
    (message: SolBuilderContextMessage | SolBuilderSolTransferResultMessage) => {
      const frameWindow = iframeRef.current?.contentWindow

      if (!frameWindow) {
        return false
      }

      try {
        frameWindow.postMessage(message, targetOrigin)
        return true
      } catch (error) {
        console.error("Failed to post SolBuilder bridge message", error)
        return false
      }
    },
    [iframeRef, targetOrigin]
  )

  const postContext = React.useCallback(
    (payload: SolBuilderContextPayload) => {
      const posted = postToIframe({
        type: "SOLBUILDER_CONTEXT",
        payload,
      })

      if (posted) {
        setStatus("connected")
      } else {
        setStatus("error")
      }
    },
    [postToIframe]
  )

  const postTransferResult = React.useCallback(
    (payload: SolBuilderSolTransferResultPayload) => {
      postToIframe({
        type: "SOLBUILDER_SOL_TRANSFER_RESULT",
        payload,
      })
    },
    [postToIframe]
  )

  React.useEffect(() => {
    appReadyRef.current = false
    transferInFlightRef.current = false
    setStatus("connecting")
    setTransferStatus({ state: "idle" })
  }, [appId, previewUrl, reloadKey])

  React.useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const frameWindow = iframeRef.current?.contentWindow

      if (!frameWindow) {
        return
      }

      if (event.source !== frameWindow) {
        return
      }

      if (event.origin !== targetOrigin) {
        console.warn("Ignored bridge message from unexpected origin", {
          origin: event.origin,
          expected: targetOrigin,
        })
        setStatus("error")
        return
      }

      if (isSolBuilderAppReadyMessage(event.data)) {
        if (!contextPayload) {
          setStatus("error")
          return
        }

        appReadyRef.current = true
        postContext(contextPayload)
        return
      }

      if (!isSolBuilderSolTransferRequestMessage(event.data)) {
        return
      }

      const request = event.data.payload

      void (async () => {
        if (transferInFlightRef.current) {
          postTransferResult({
            requestId: request.requestId,
            status: "error",
            error: "Another transfer is already in progress",
          })
          return
        }

        const currentUser = userRef.current
        if (!currentUser) {
          postTransferResult({
            requestId: request.requestId,
            status: "error",
            error: "User is not authenticated",
          })
          setTransferStatus({
            state: "error",
            requestId: request.requestId,
            error: "User is not authenticated",
            amountSol: request.amountSol,
          })
          return
        }

        const wallet = walletRef.current
        if (!wallet.connected || !wallet.publicKey || !wallet.walletAddress) {
          postTransferResult({
            requestId: request.requestId,
            status: "error",
            error: "Wallet is not connected",
          })
          setTransferStatus({
            state: "error",
            requestId: request.requestId,
            error: "Wallet is not connected",
            amountSol: request.amountSol,
          })
          return
        }

        const amountError = validateTransferAmount(request.amountSol)
        if (amountError) {
          postTransferResult({
            requestId: request.requestId,
            status: "error",
            error: amountError,
          })
          setTransferStatus({
            state: "error",
            requestId: request.requestId,
            error: amountError,
            amountSol: request.amountSol,
          })
          return
        }

        const recipientOrError = parseRecipientPublicKey(request.recipient)
        if (typeof recipientOrError === "string") {
          postTransferResult({
            requestId: request.requestId,
            status: "error",
            error: recipientOrError,
          })
          setTransferStatus({
            state: "error",
            requestId: request.requestId,
            error: recipientOrError,
            amountSol: request.amountSol,
          })
          return
        }

        transferInFlightRef.current = true
        setTransferStatus({
          state: "pending",
          requestId: request.requestId,
          amountSol: request.amountSol,
          recipient: request.recipient,
        })

        let result: Awaited<ReturnType<typeof executeSolTransfer>>

        try {
          result = await executeSolTransfer({
            connection,
            fromPublicKey: wallet.publicKey,
            recipient: recipientOrError,
            amountSol: request.amountSol,
            sendTransaction: wallet.sendTransaction,
            signTransaction: wallet.signTransaction,
          })
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Transfer failed"

          result = {
            status: "error",
            error: message,
          }
        } finally {
          transferInFlightRef.current = false
        }

        if (result.status === "success") {
          postTransferResult({
            requestId: request.requestId,
            status: "success",
            signature: result.signature,
          })
          setTransferStatus({
            state: "success",
            requestId: request.requestId,
            signature: result.signature,
            amountSol: request.amountSol,
          })
          return
        }

        postTransferResult({
          requestId: request.requestId,
          status: result.status,
          error: result.error,
        })
        setTransferStatus({
          state: result.status,
          requestId: request.requestId,
          error: result.error,
          amountSol: request.amountSol,
        })
      })()
    }

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [
    connection,
    contextPayload,
    iframeRef,
    postContext,
    postTransferResult,
    targetOrigin,
  ])

  React.useEffect(() => {
    if (!appReadyRef.current || !contextPayload) {
      return
    }

    postContext(contextPayload)
  }, [contextPayload, postContext, walletAddress])

  return { status, transferStatus }
}
