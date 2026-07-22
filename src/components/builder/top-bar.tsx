import { RiWalletLine } from "@remixicon/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { statusLabel, type MockApp, type MockUser } from "@/data/mock"

type TopBarProps = {
  app: MockApp
  user: MockUser
}

export function TopBar({ app, user }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            SolBuilder
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-sm font-medium">{app.name}</span>
        </div>
        <Badge
          variant={app.status === "ready" ? "default" : "secondary"}
          className="shrink-0"
        >
          {statusLabel[app.status]}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="sm" disabled>
                <RiWalletLine data-icon="inline-start" />
                Connect wallet
              </Button>
            }
          />
          <TooltipContent>Wallet connection lands in Phase 3</TooltipContent>
        </Tooltip>

        <Avatar size="sm" title={user.name}>
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
