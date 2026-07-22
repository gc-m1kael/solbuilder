import { RiAddLine } from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { statusLabel, type MockApp } from "@/data/mock"
import { cn } from "@/lib/utils"

type AppsSidebarProps = {
  apps: MockApp[]
  selectedAppId: string
  onSelectApp: (appId: string) => void
}

export function AppsSidebar({
  apps,
  selectedAppId,
  onSelectApp,
}: AppsSidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Apps</h2>
        <Button variant="ghost" size="icon-sm" aria-label="New app" disabled>
          <RiAddLine />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {apps.map((app) => {
            const selected = app.id === selectedAppId

            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onSelectApp(app.id)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/70"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {app.name}
                  </span>
                  <Badge
                    variant={app.status === "ready" ? "default" : "outline"}
                    className="shrink-0"
                  >
                    {statusLabel[app.status]}
                  </Badge>
                </div>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {app.description}
                </span>
              </button>
            )
          })}
        </div>
      </ScrollArea>
      <div className="border-t border-sidebar-border px-4 py-3">
        <Button className="w-full" size="sm" disabled>
          <RiAddLine data-icon="inline-start" />
          New app
        </Button>
      </div>
    </aside>
  )
}
