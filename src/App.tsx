import * as React from "react"
import { SignIn, UserButton, useUser } from "@clerk/react"
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react"
import { useQuery } from "convex/react"

import { AppsListScreen } from "@/components/screens/apps-list"
import { GeneratedAppScreen } from "@/components/screens/generated-app"
import { GroupChatScreen } from "@/components/screens/group-chat"
import { TooltipProvider } from "@/components/ui/tooltip"
import { api } from "../convex/_generated/api"
import {
  mockApps,
  mockMembersByAppId,
  mockMessagesByAppId,
  type MockMessage,
} from "@/data/mock"

type Screen = "apps" | "chat" | "generated"

function AuthenticatedApp() {
  const { user } = useUser()
  const convexUser = useQuery(api.auth.currentUser)
  const [screen, setScreen] = React.useState<Screen>("apps")
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null)
  const [messagesByAppId, setMessagesByAppId] =
    React.useState<Record<string, MockMessage[]>>(mockMessagesByAppId)

  const selectedApp = mockApps.find((app) => app.id === selectedAppId) ?? null
  const members = selectedApp
    ? (mockMembersByAppId[selectedApp.id] ?? [])
    : []
  const messages = selectedApp
    ? (messagesByAppId[selectedApp.id] ?? [])
    : []

  const displayName =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    convexUser?.name ??
    "You"
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U"

  function handleOpenApp(appId: string) {
    setSelectedAppId(appId)
    setScreen("chat")
  }

  function handleBackToApps() {
    setScreen("apps")
    setSelectedAppId(null)
  }

  function handleBackToChat() {
    setScreen("chat")
  }

  function handleOpenGeneratedApp() {
    setScreen("generated")
  }

  function handleSendMessage(content: string) {
    if (!selectedApp) {
      return
    }

    const nextMessage: MockMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      author: displayName,
      initials,
      content,
      createdAt: "Just now",
    }

    setMessagesByAppId((current) => ({
      ...current,
      [selectedApp.id]: [...(current[selectedApp.id] ?? []), nextMessage],
    }))
  }

  return (
    <>
      {screen === "apps" ? (
        <AppsListScreen
          apps={mockApps}
          onOpenApp={handleOpenApp}
          userSlot={<UserButton />}
        />
      ) : null}

      {screen === "chat" && selectedApp ? (
        <GroupChatScreen
          app={selectedApp}
          members={members}
          messages={messages}
          onBack={handleBackToApps}
          onOpenGeneratedApp={handleOpenGeneratedApp}
          onSendMessage={handleSendMessage}
        />
      ) : null}

      {screen === "generated" && selectedApp ? (
        <GeneratedAppScreen
          app={selectedApp}
          members={members}
          onBack={handleBackToChat}
        />
      ) : null}
    </>
  )
}

export function App() {
  return (
    <TooltipProvider>
      <div className="min-h-svh bg-muted/40 text-foreground">
        <div className="mx-auto h-svh w-full max-w-lg overflow-hidden bg-background shadow-sm">
          <AuthLoading>
            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
              Loading…
            </div>
          </AuthLoading>

          <Unauthenticated>
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <SignIn routing="hash" />
            </div>
          </Unauthenticated>

          <Authenticated>
            <AuthenticatedApp />
          </Authenticated>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
