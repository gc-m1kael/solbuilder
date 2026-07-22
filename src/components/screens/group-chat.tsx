import * as React from "react"
import {
  RiArrowLeftLine,
  RiArrowUpLine,
  RiCloseLine,
  RiLoader4Line,
  RiPlayFill,
} from "@remixicon/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  GENERATION_STEP_LABELS,
  type ChatMessage,
} from "@/lib/chat"
import { cn } from "@/lib/utils"

export type GenerationInfo = {
  status: string
  currentStep: string
  error?: string
  lastProgressMessage?: string
}

type ChatMember = {
  name: string
  initials: string
}

type GroupChatScreenProps = {
  appName: string
  members: ChatMember[]
  messages: ChatMessage[] | undefined
  currentUserId: string | null
  generation: GenerationInfo | null
  sendError: string | null
  onDismissError: () => void
  onRetry: () => void
  onBack: () => void
  onOpenGeneratedApp: () => void
  onSendMessage: (content: string) => void
}

function GenerationStatusCard({
  generation,
  onRetry,
}: {
  generation: GenerationInfo
  onRetry: () => void
}) {
  if (generation.status === "completed") {
    return null
  }

  if (generation.status === "failed") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
        <p className="text-[12px] font-medium text-destructive">
          Generation failed
        </p>
        {generation.error ? (
          <p className="mt-0.5 break-words text-[12px] text-muted-foreground">
            {generation.error}
          </p>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 h-7 rounded-md px-2.5 text-xs"
        >
          Retry
        </Button>
      </div>
    )
  }

  const label =
    GENERATION_STEP_LABELS[generation.currentStep] ??
    GENERATION_STEP_LABELS[generation.status] ??
    generation.status.replaceAll("_", " ")

  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2.5">
      <RiLoader4Line className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[12px] font-medium">{label}</p>
        {generation.lastProgressMessage ? (
          <p className="mt-0.5 break-words text-[12px] text-muted-foreground">
            {generation.lastProgressMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function GroupChatScreen({
  appName,
  members,
  messages,
  currentUserId,
  generation,
  sendError,
  onDismissError,
  onRetry,
  onBack,
  onOpenGeneratedApp,
  onSendMessage,
}: GroupChatScreenProps) {
  const [draft, setDraft] = React.useState("")
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, generation?.status, generation?.lastProgressMessage])

  function handleSend() {
    const content = draft.trim()
    if (!content) {
      return
    }

    onSendMessage(content)
    setDraft("")
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to apps"
          onClick={onBack}
          className="rounded-md"
        >
          <RiArrowLeftLine />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{appName}</div>
          <div className="mt-0.5 flex items-center">
            {members.slice(0, 4).map((member, index) => (
              <Avatar
                key={`${member.initials}-${index}`}
                size="sm"
                className={cn("size-5", index > 0 && "-ml-1.5")}
                title={member.name}
              >
                <AvatarFallback className="text-[8px]">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenGeneratedApp}
          className="h-7 rounded-md px-2 text-xs"
        >
          <RiPlayFill className="size-3.5" />
          Open app
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-3 py-3">
          {messages === undefined ? (
            <>
              <div className="h-10 w-3/5 animate-pulse rounded-2xl bg-muted/50" />
              <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-muted/50" />
              <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-muted/50" />
            </>
          ) : messages.length === 0 && !generation ? (
            <p className="py-10 text-center text-[12px] text-muted-foreground">
              No messages yet. Say hi, or mention @cursor to build the app.
            </p>
          ) : (
            messages.map((message) => {
              const isOwn =
                message.role === "user" &&
                message.userId !== null &&
                message.userId === currentUserId

              if (isOwn) {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-foreground/[0.06] px-3 py-2">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                        {message.text}
                      </p>
                    </div>
                  </div>
                )
              }

              if (message.role === "assistant") {
                return (
                  <div key={message.id} className="flex gap-2">
                    <Avatar size="sm" className="mt-0.5 size-6">
                      <AvatarFallback className="bg-primary/25 text-[9px] font-semibold text-foreground">
                        SB
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 max-w-[80%]">
                      <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                        SolBuilder
                      </div>
                      <div className="rounded-2xl rounded-tl-md bg-muted/60 px-3 py-2">
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={message.id} className="flex gap-2">
                  <Avatar size="sm" className="mt-0.5 size-6">
                    <AvatarFallback className="text-[9px]">M</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 max-w-[80%]">
                    <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                      Member
                    </div>
                    <div className="rounded-2xl rounded-tl-md bg-muted/40 px-3 py-2">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                        {message.text}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {generation ? (
            <GenerationStatusCard generation={generation} onRetry={onRetry} />
          ) : null}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/50 p-2.5">
        {sendError ? (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2">
            <p className="min-w-0 flex-1 break-words text-[12px] text-destructive">
              {sendError}
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onDismissError}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-xl bg-muted/40 p-1.5">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (@cursor to build)"
            className="min-h-10 flex-1 border-0 bg-transparent px-2 py-2 text-[13px] shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon-sm"
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="rounded-md"
          >
            <RiArrowUpLine />
          </Button>
        </div>
      </div>
    </div>
  )
}
