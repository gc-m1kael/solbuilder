import * as React from "react"
import { RiSendPlane2Line } from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import type { MockApp, MockMessage } from "@/data/mock"
import { cn } from "@/lib/utils"

type ChatPanelProps = {
  app: MockApp
  messages: MockMessage[]
  onSendMessage: (content: string) => void
}

export function ChatPanel({ app, messages, onSendMessage }: ChatPanelProps) {
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
    <section className="flex w-[420px] shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Chat</h2>
          <p className="text-xs text-muted-foreground">
            Prompt updates for {app.name}
          </p>
        </div>
        <Badge variant={app.status === "generating" ? "default" : "secondary"}>
          {app.status === "generating" ? "Generating…" : "Idle"}
        </Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex max-w-[92%] flex-col gap-1",
                message.role === "user" ? "self-end" : "self-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.content}
              </div>
              <span
                className={cn(
                  "text-[11px] text-muted-foreground",
                  message.role === "user" ? "text-right" : "text-left"
                )}
              >
                {message.role === "user" ? "You" : "SolBuilder"} ·{" "}
                {message.createdAt}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {app.status === "generating"
              ? "Generation in progress (mock)."
              : "Local mock chat — Cursor updates come in Phase 4."}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a change to this app…"
            className="min-h-20"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSend} disabled={!draft.trim()}>
              Send
              <RiSendPlane2Line data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
