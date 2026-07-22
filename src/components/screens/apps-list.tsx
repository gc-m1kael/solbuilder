import * as React from "react"
import { RiAddLine, RiPlayFill } from "@remixicon/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Id } from "../../../convex/_generated/dataModel"
import { formatTimestamp, initialsForName } from "@/lib/chat"

export type AppListItem = {
  _id: Id<"apps">
  name: string
  status: string
  updatedAt: number
}

type AppsListScreenProps = {
  apps: AppListItem[] | undefined
  onOpenApp: (appId: Id<"apps">) => void
  onCreateApp: (name: string) => Promise<void>
  walletSlot: React.ReactNode
  userSlot: React.ReactNode
}

export function AppsListScreen({
  apps,
  onOpenApp,
  onCreateApp,
  walletSlot,
  userSlot,
}: AppsListScreenProps) {
  const [showForm, setShowForm] = React.useState(false)
  const [name, setName] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || creating) {
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      await onCreateApp(trimmed)
      setName("")
      setShowForm(false)
    } catch {
      setCreateError("Could not create the app. Try again.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 px-3">
        <h1 className="text-[15px] font-semibold tracking-tight">SolBuilder</h1>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New app"
          onClick={() => setShowForm((value) => !value)}
          className="rounded-md"
        >
          <RiAddLine />
        </Button>
        <div className="flex items-center gap-1.5">
          {walletSlot}
          <div className="flex size-8 items-center justify-center">
            {userSlot}
          </div>
        </div>
      </header>

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="flex shrink-0 flex-col gap-1.5 border-b border-border/50 px-3 pb-3"
        >
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="App name…"
              className="h-8 min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2.5 text-[13px] outline-none placeholder:text-muted-foreground focus:border-ring"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || creating}
              className="h-8 rounded-md px-3 text-xs"
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
          {createError ? (
            <p className="text-[11px] text-destructive">{createError}</p>
          ) : null}
        </form>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        {apps === undefined ? (
          <div className="flex flex-col gap-2 px-3 py-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-muted/50"
              />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <p className="text-[14px] font-medium">Create your first app</p>
            <p className="text-[12px] text-muted-foreground">
              Tap + to start a new collaborative Solana app.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {apps.map((app) => (
              <button
                key={app._id}
                type="button"
                onClick={() => onOpenApp(app._id)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 active:bg-muted/70"
              >
                <Avatar size="lg" className="rounded-xl after:rounded-xl">
                  <AvatarFallback className="rounded-xl bg-muted text-[12px] font-semibold">
                    {initialsForName(app.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium">
                      {app.name}
                    </span>
                    <RiPlayFill className="size-3 shrink-0 text-muted-foreground/70" />
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {formatTimestamp(app.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="truncate text-[12px] text-muted-foreground">
                      {app.status === "completed"
                        ? "Ready"
                        : app.status === "failed"
                          ? "Generation failed"
                          : app.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
