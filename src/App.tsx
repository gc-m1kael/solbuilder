import * as React from "react"
import { SignIn, UserButton, useUser } from "@clerk/react"
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react"
import { useMutation, useQuery } from "convex/react"

import { AppsListScreen } from "@/components/screens/apps-list"
import { GeneratedAppScreen } from "@/components/screens/generated-app"
import { GroupChatScreen } from "@/components/screens/group-chat"
import { TooltipProvider } from "@/components/ui/tooltip"
import { WalletButton } from "@/components/wallet/wallet-button"
import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import {
  cleanErrorMessage,
  initialsForName,
  normalizeMessages,
} from "@/lib/chat"

type Screen = "apps" | "chat" | "generated"

const MESSAGE_PAGE = { numItems: 200, cursor: null }

function AuthenticatedApp() {
  const { user } = useUser()
  const convexUser = useQuery(api.auth.currentUser)
  const [screen, setScreen] = React.useState<Screen>("apps")
  const [selectedAppId, setSelectedAppId] = React.useState<Id<"apps"> | null>(
    null
  )
  const [sendError, setSendError] = React.useState<string | null>(null)

  const apps = useQuery(api.apps.listApps)
  const selectedApp = useQuery(
    api.apps.getApp,
    selectedAppId ? { appId: selectedAppId } : "skip"
  )
  const rawMessages = useQuery(
    api.threads.listAppMessages,
    selectedAppId
      ? { appId: selectedAppId, paginationOpts: MESSAGE_PAGE }
      : "skip"
  )
  const generation = useQuery(
    api.generation.getGenerationStatus,
    selectedAppId ? { appId: selectedAppId } : "skip"
  )

  const memberRows = useQuery(
    api.apps.listMembers,
    selectedAppId ? { appId: selectedAppId } : "skip"
  )

  const createApp = useMutation(api.apps.createApp)
  const sendAppMessage = useMutation(api.generation.sendAppMessage)
  const sendChatMessage = useMutation(api.threads.sendChatMessage)
  const retryGeneration = useMutation(api.generation.retryGeneration)
  const getOrCreateInviteCode = useMutation(api.apps.getOrCreateInviteCode)
  const joinAppByInviteCode = useMutation(api.apps.joinAppByInviteCode)

  const messages = React.useMemo(
    () => (rawMessages === undefined ? undefined : normalizeMessages(rawMessages)),
    [rawMessages]
  )

  const currentUserId = convexUser?.subject ?? user?.id ?? null
  const displayName =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    convexUser?.name ??
    "You"
  const members = React.useMemo(() => {
    if (!memberRows || memberRows.length === 0) {
      return [{ name: displayName, initials: initialsForName(displayName) }]
    }
    return memberRows.map((member) => ({
      name: member.name,
      initials: initialsForName(member.name),
    }))
  }, [memberRows, displayName])

  function handleOpenApp(appId: Id<"apps">) {
    setSelectedAppId(appId)
    setSendError(null)
    setScreen("chat")
  }

  const joinHandledRef = React.useRef(false)
  React.useEffect(() => {
    if (joinHandledRef.current) {
      return
    }
    joinHandledRef.current = true

    const code = new URLSearchParams(window.location.search).get("join")
    if (!code) {
      return
    }

    void (async () => {
      try {
        const result = await joinAppByInviteCode({ code })
        if (result) {
          handleOpenApp(result.appId)
        }
      } catch {
        // Invalid code or transient error — ignore silently.
      } finally {
        const url = new URL(window.location.href)
        url.searchParams.delete("join")
        window.history.replaceState({}, "", url)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreateInviteLink(): Promise<string> {
    if (!selectedAppId) {
      throw new Error("No app selected")
    }
    const code = await getOrCreateInviteCode({ appId: selectedAppId })
    return `${window.location.origin}/?join=${code}`
  }

  async function handleCreateApp(name: string) {
    const app = await createApp({ name })
    handleOpenApp(app._id)
  }

  function handleBackToApps() {
    setScreen("apps")
    setSelectedAppId(null)
    setSendError(null)
  }

  async function handleSendMessage(content: string) {
    if (!selectedAppId) {
      return
    }
    setSendError(null)
    try {
      if (/@cursor/i.test(content)) {
        await sendAppMessage({ appId: selectedAppId, prompt: content })
      } else {
        await sendChatMessage({ appId: selectedAppId, prompt: content })
      }
    } catch (error) {
      setSendError(cleanErrorMessage(error))
    }
  }

  async function handleRetryGeneration() {
    if (!selectedAppId) {
      return
    }
    setSendError(null)
    try {
      await retryGeneration({ appId: selectedAppId })
    } catch (error) {
      setSendError(cleanErrorMessage(error))
    }
  }

  return (
    <>
      {screen === "apps" ? (
        <AppsListScreen
          apps={apps}
          onOpenApp={handleOpenApp}
          onCreateApp={handleCreateApp}
          walletSlot={<WalletButton />}
          userSlot={<UserButton />}
        />
      ) : null}

      {screen === "chat" && selectedAppId ? (
        <GroupChatScreen
          appName={selectedApp?.name ?? "…"}
          members={members}
          messages={messages}
          currentUserId={currentUserId}
          generation={generation ?? null}
          sendError={sendError}
          onDismissError={() => setSendError(null)}
          onRetry={() => void handleRetryGeneration()}
          onBack={handleBackToApps}
          onOpenGeneratedApp={() => setScreen("generated")}
          onSendMessage={(content) => void handleSendMessage(content)}
          onCreateInviteLink={handleCreateInviteLink}
        />
      ) : null}

      {screen === "generated" && selectedAppId ? (
        <GeneratedAppScreen
          appId={selectedAppId}
          appName={selectedApp?.name ?? "App"}
          deploymentUrl={selectedApp?.vercelDeploymentUrl ?? null}
          members={members}
          onBack={() => setScreen("chat")}
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
