import * as React from "react"
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiRefreshLine,
  RiWalletLine,
} from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MockApp } from "@/data/mock"
import { getPreviewUrl } from "@/lib/preview-url"

type GeneratedAppScreenProps = {
  app: MockApp
  onBack: () => void
}

export function GeneratedAppScreen({ app, onBack }: GeneratedAppScreenProps) {
  const [reloadKey, setReloadKey] = React.useState(0)
  const previewUrl = getPreviewUrl()

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

        <div className="min-w-0 flex-1 truncate text-[14px] font-medium">
          {app.name}
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

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-7 rounded-md px-2 text-xs"
              >
                <RiWalletLine className="size-3.5" />
                Wallet
              </Button>
            }
          />
          <TooltipContent>Wallet connection lands later</TooltipContent>
        </Tooltip>
      </header>

      <div className="min-h-0 flex-1 bg-muted/20">
        <iframe
          key={`${app.id}-${previewUrl}-${reloadKey}`}
          title={`${app.name}`}
          src={previewUrl}
          className="size-full border-0 bg-background"
        />
      </div>
    </div>
  )
}
