import * as React from "react"

import {
  isSolBuilderAppReadyMessage,
  type SolBuilderBridgeMember,
  type SolBuilderBridgeUser,
  type SolBuilderContextMessage,
  type SolBuilderContextPayload,
} from "@/lib/bridge/messages"
import { getPreviewOrigin } from "@/lib/bridge/origin"

export type HostBridgeStatus = "connecting" | "connected" | "error"

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
  const [status, setStatus] = React.useState<HostBridgeStatus>("connecting")
  const appReadyRef = React.useRef(false)
  const targetOrigin = React.useMemo(
    () => getPreviewOrigin(previewUrl),
    [previewUrl]
  )

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

  const postContext = React.useCallback(
    (payload: SolBuilderContextPayload) => {
      const frameWindow = iframeRef.current?.contentWindow

      if (!frameWindow) {
        setStatus("error")
        return
      }

      const message: SolBuilderContextMessage = {
        type: "SOLBUILDER_CONTEXT",
        payload,
      }

      try {
        frameWindow.postMessage(message, targetOrigin)
        setStatus("connected")
      } catch (error) {
        console.error("Failed to post SolBuilder context", error)
        setStatus("error")
      }
    },
    [iframeRef, targetOrigin]
  )

  React.useEffect(() => {
    appReadyRef.current = false
    setStatus("connecting")
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

      if (!isSolBuilderAppReadyMessage(event.data)) {
        return
      }

      if (!contextPayload) {
        setStatus("error")
        return
      }

      appReadyRef.current = true
      postContext(contextPayload)
    }

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [contextPayload, iframeRef, postContext, targetOrigin])

  React.useEffect(() => {
    if (!appReadyRef.current || !contextPayload) {
      return
    }

    postContext(contextPayload)
  }, [contextPayload, postContext, walletAddress])

  return { status }
}
