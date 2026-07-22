import type { ReactNode } from "react"
import { RiAddLine, RiPlayFill } from "@remixicon/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { MockApp } from "@/data/mock"

type AppsListScreenProps = {
  apps: MockApp[]
  onOpenApp: (appId: string) => void
  userSlot: ReactNode
}

export function AppsListScreen({
  apps,
  onOpenApp,
  userSlot,
}: AppsListScreenProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 px-3">
        <h1 className="text-[15px] font-semibold tracking-tight">SolBuilder</h1>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New app"
          disabled
          className="rounded-md"
        >
          <RiAddLine />
        </Button>
        <div className="flex size-8 items-center justify-center">{userSlot}</div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpenApp(app.id)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
            >
              <Avatar size="lg" className="rounded-xl after:rounded-xl">
                <AvatarFallback className="rounded-xl bg-muted text-[12px] font-semibold">
                  {app.initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium">
                    {app.name}
                  </span>
                  <RiPlayFill className="size-3 shrink-0 text-muted-foreground/70" />
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {app.timestamp}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-[12px] text-muted-foreground">
                    {app.lastActivity}
                  </p>
                  {app.unread ? (
                    <span className="ml-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {app.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
