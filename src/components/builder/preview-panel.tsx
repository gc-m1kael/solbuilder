import * as React from "react"
import { RiExternalLinkLine, RiRefreshLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { MockApp } from "@/data/mock"

const DEMO_APP_SRC = "/demo-app/index.html"

type PreviewPanelProps = {
  app: MockApp
}

export function PreviewPanel({ app }: PreviewPanelProps) {
  const [reloadKey, setReloadKey] = React.useState(0)

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-muted/30">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Preview</p>
          <p className="truncate text-xs text-muted-foreground">
            {app.name} · local demo app
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Refresh preview"
                  onClick={() => setReloadKey((value) => value + 1)}
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
                  size="icon-sm"
                  aria-label="Open external"
                  disabled
                >
                  <RiExternalLinkLine />
                </Button>
              }
            />
            <TooltipContent>External preview comes later</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 p-4">
        <div className="size-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <iframe
            key={`${app.id}-${reloadKey}`}
            title={`${app.name} preview`}
            src={DEMO_APP_SRC}
            className="size-full bg-background"
          />
        </div>
      </div>
    </section>
  )
}
