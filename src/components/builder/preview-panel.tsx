import * as React from "react"
import { RiExternalLinkLine, RiRefreshLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MockApp } from "@/data/mock"

const FALLBACK_APP_URL = "/demo-app/index.html"

function getPreviewUrl() {
  const configuredUrl = import.meta.env.VITE_GENERATED_APP_URL?.trim()

  if (configuredUrl) {
    return configuredUrl
  }

  return FALLBACK_APP_URL
}

type PreviewPanelProps = {
  app: MockApp
}

export function PreviewPanel({ app }: PreviewPanelProps) {
  const [reloadKey, setReloadKey] = React.useState(0)
  const previewUrl = getPreviewUrl()

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-muted/25">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <div className="flex min-w-0 flex-1 items-center rounded-md bg-background/80 px-2.5 py-1 text-[12px] text-muted-foreground ring-1 ring-border/50">
          <span className="truncate">{previewUrl}</span>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Refresh preview"
                onClick={() => setReloadKey((value) => value + 1)}
                className="rounded-md"
              >
                <RiRefreshLine />
              </Button>
            }
          />
          <TooltipContent>Refresh preview</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
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
      </div>

      <div className="min-h-0 flex-1 p-3 pt-1">
        <iframe
          key={`${app.id}-${previewUrl}-${reloadKey}`}
          title={`${app.name} preview`}
          src={previewUrl}
          className="size-full rounded-md border border-border/70 bg-background"
        />
      </div>
    </section>
  )
}
