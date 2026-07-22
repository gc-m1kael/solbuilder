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
import { WalletButton } from "@/components/wallet/wallet-button"
import { useHostBridge } from "@/hooks/use-host-bridge"
import type { MockApp, MockMember } from "@/data/mock"
import { getPreviewUrl } from "@/lib/preview-url"
import { cn } from "@/lib/utils"

type GeneratedAppScreenProps = {
  app: MockApp
  members: MockMember[]
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

export function GeneratedAppScreen({
  app,
  members,
  onBack,
}: GeneratedAppScreenProps) {
  const { user } = useUser()
  const { publicKey } = useWallet()
  const [reloadKey, setReloadKey] = React.useState(0)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const previewUrl = getPreviewUrl()

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

  const { status: bridgeStatus } = useHostBridge({
    iframeRef,
    appId: app.id,
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
          <div className="truncate text-[14px] font-medium">{app.name}</div>
          <BridgeStatusBadge status={bridgeStatus} />
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

        <WalletButton />
      </header>

      <div className="min-h-0 flex-1 bg-muted/20">
        <iframe
          ref={iframeRef}
          key={`${app.id}-${previewUrl}-${reloadKey}`}
          title={`${app.name}`}
          src={previewUrl}
          className="size-full border-0 bg-background"
        />
      </div>
    </div>
  )
}
