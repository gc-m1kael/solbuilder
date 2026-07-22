import * as React from "react"
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiRefreshLine,
} from "@remixicon/react"
import { useUser } from "@clerk/react"
import { useWallet } from "@solana/wallet-adapter-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useHostBridge,
  type HostTransferUiStatus,
} from "@/hooks/use-host-bridge"
import type { SolBuilderBridgeMember } from "@/lib/bridge/messages"
import { getPreviewUrl } from "@/lib/preview-url"
import { cn } from "@/lib/utils"

type GeneratedAppScreenProps = {
  appId: string
  appName: string
  deploymentUrl: string | null
  members: SolBuilderBridgeMember[]
  onBack: () => void
}

function BridgeStatusBadge({
  status,
}: {
  status: "connecting" | "connected" | "error"
}) {
  const label =
    status === "connected"
      ? "connected"
      : status === "error"
        ? "error"
        : "connecting"

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
      title={`Bridge ${label}`}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-muted-foreground/40",
          status === "connected" && "bg-primary",
          status === "connecting" && "animate-pulse bg-muted-foreground/70",
          status === "error" && "bg-destructive"
        )}
      />
      <span>{label}</span>
    </span>
  )
}

function TransferStatusBadge({ status }: { status: HostTransferUiStatus }) {
  if (status.state === "idle") {
    return null
  }

  if (status.state === "pending") {
    return (
      <span
        className="truncate text-[11px] text-muted-foreground"
        title={`Confirm ${status.amountSol} SOL transfer in Phantom`}
      >
        pending {status.amountSol} SOL…
      </span>
    )
  }

  if (status.state === "success") {
    return (
      <span
        className="truncate text-[11px] text-primary"
        title={status.signature}
      >
        sent {status.amountSol} SOL
      </span>
    )
  }

  if (status.state === "cancelled") {
    return (
      <span
        className="truncate text-[11px] text-muted-foreground"
        title={status.error}
      >
        {status.error || "cancelled"}
      </span>
    )
  }

  return (
    <span
      className="truncate text-[11px] text-destructive"
      title={status.error}
    >
      {status.error || "transfer error"}
    </span>
  )
}

export function GeneratedAppScreen({
  appId,
  appName,
  deploymentUrl,
  members,
  onBack,
}: GeneratedAppScreenProps) {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const [reloadKey, setReloadKey] = React.useState(0)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const previewUrl = deploymentUrl?.trim() || getPreviewUrl()

  const bridgeUser = React.useMemo(() => {
    if (!user) {
      return null
    }

    return {
      id: user.id,
      name:
        user.fullName ??
        user.primaryEmailAddress?.emailAddress ??
        "User",
      avatarUrl: user.imageUrl ?? null,
    }
  }, [user])

  const walletAddress = publicKey?.toBase58() ?? null

  const { status: bridgeStatus, transferStatus } = useHostBridge({
    iframeRef,
    appId,
    user: bridgeUser,
    walletAddress,
    members,
    previewUrl,
    reloadKey,
  })

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1.5 px-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to chat"
          onClick={onBack}
          className="rounded-md"
        >
          <RiArrowLeftLine />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="truncate text-[14px] font-medium">{appName}</div>
          <BridgeStatusBadge status={bridgeStatus} />
          <TransferStatusBadge status={transferStatus} />
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh app"
                onClick={() => setReloadKey((value) => value + 1)}
                className="rounded-md"
              >
                <RiRefreshLine />
              </Button>
            }
          />
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Open external"
                className="rounded-md"
                onClick={() =>
                  window.open(previewUrl, "_blank", "noopener,noreferrer")
                }
              >
                <RiExternalLinkLine />
              </Button>
            }
          />
          <TooltipContent>Open in new tab</TooltipContent>
        </Tooltip>
      </header>

      <div className="min-h-0 flex-1 bg-muted/20">
        <iframe
          ref={iframeRef}
          key={`${appId}-${previewUrl}-${reloadKey}`}
          title={appName}
          src={previewUrl}
          className="size-full border-0 bg-background"
        />
      </div>
    </div>
  )
}
