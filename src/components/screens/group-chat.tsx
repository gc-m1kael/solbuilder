import * as React from "react"
import {
  RiArrowLeftLine,
  RiArrowUpLine,
  RiPlayFill,
} from "@remixicon/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { MockApp, MockMember, MockMessage } from "@/data/mock"
import { cn } from "@/lib/utils"

type GroupChatScreenProps = {
  app: MockApp
  members: MockMember[]
  messages: MockMessage[]
  onBack: () => void
  onOpenGeneratedApp: () => void
  onSendMessage: (content: string) => void
}

export function GroupChatScreen({
  app,
  members,
  messages,
  onBack,
  onOpenGeneratedApp,
  onSendMessage,
}: GroupChatScreenProps) {
  const [draft, setDraft] = React.useState("")
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

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
          <div className="truncate text-[14px] font-medium">{app.name}</div>
          <div className="mt-0.5 flex items-center">
            {members.slice(0, 4).map((member, index) => (
              <Avatar
                key={member.initials}
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
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-foreground/[0.06] px-3 py-2">
                    <p className="text-[13px] leading-relaxed">
                      {message.content}
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
                      {message.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 max-w-[80%]">
                    <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                      {message.author}
                    </div>
                    <div className="rounded-2xl rounded-tl-md bg-muted/60 px-3 py-2">
                      <p className="text-[13px] leading-relaxed text-foreground/90">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={message.id} className="flex gap-2">
                <Avatar size="sm" className="mt-0.5 size-6">
                  <AvatarFallback className="text-[9px]">
                    {message.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 max-w-[80%]">
                  <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                    {message.author}
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-muted/40 px-3 py-2">
                    <p className="text-[13px] leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/50 p-2.5">
        <div className="flex items-end gap-2 rounded-xl bg-muted/40 p-1.5">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
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
