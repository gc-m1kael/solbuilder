import * as React from "react"

import { AppsSidebar } from "@/components/builder/apps-sidebar"
import { ChatPanel } from "@/components/builder/chat-panel"
import { PreviewPanel } from "@/components/builder/preview-panel"
import { TopBar } from "@/components/builder/top-bar"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  mockApps,
  mockMessagesByAppId,
  mockUser,
  type MockMessage,
} from "@/data/mock"

export function App() {
  const [selectedAppId, setSelectedAppId] = React.useState(mockApps[0].id)
  const [messagesByAppId, setMessagesByAppId] =
    React.useState<Record<string, MockMessage[]>>(mockMessagesByAppId)

  const selectedApp =
    mockApps.find((app) => app.id === selectedAppId) ?? mockApps[0]
  const messages = messagesByAppId[selectedApp.id] ?? []

  function handleSendMessage(content: string) {
    const nextMessage: MockMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      createdAt: "Just now",
    }

    setMessagesByAppId((current) => ({
      ...current,
      [selectedApp.id]: [...(current[selectedApp.id] ?? []), nextMessage],
    }))
  }

  return (
    <TooltipProvider>
      <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
        <TopBar app={selectedApp} user={mockUser} />
        <div className="flex min-h-0 flex-1">
          <AppsSidebar
            apps={mockApps}
            selectedAppId={selectedApp.id}
            onSelectApp={setSelectedAppId}
          />
          <ChatPanel
            app={selectedApp}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
          <PreviewPanel app={selectedApp} />
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
