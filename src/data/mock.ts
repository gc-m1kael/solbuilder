export type AppStatus = "ready" | "generating" | "draft"

export type MockApp = {
  id: string
  name: string
  status: AppStatus
  description: string
}

export type MessageRole = "user" | "assistant"

export type MockMessage = {
  id: string
  role: MessageRole
  content: string
  createdAt: string
}

export type MockUser = {
  name: string
  initials: string
}

export const mockUser: MockUser = {
  name: "Maya Chen",
  initials: "MC",
}

export const mockApps: MockApp[] = [
  {
    id: "app-pool",
    name: "Squad SOL Pool",
    status: "ready",
    description: "Group contribution challenge for a shared Solana goal.",
  },
  {
    id: "app-tips",
    name: "Creator Tips",
    status: "draft",
    description: "Tip jar for collaborative creator drops.",
  },
  {
    id: "app-split",
    name: "Rent Split",
    status: "generating",
    description: "Shared rent tracker with on-chain settlements.",
  },
]

export const mockMessagesByAppId: Record<string, MockMessage[]> = {
  "app-pool": [
    {
      id: "msg-1",
      role: "user",
      content:
        "Build a group contribution challenge where friends chip in SOL toward a shared goal.",
      createdAt: "10:14 AM",
    },
    {
      id: "msg-2",
      role: "assistant",
      content:
        "I scaffolded Squad SOL Pool with a progress meter, participant list, and a Contribute action. Wallet wiring comes in a later phase — the button is disabled for now.",
      createdAt: "10:15 AM",
    },
    {
      id: "msg-3",
      role: "user",
      content: "Make the target 5 SOL and show four mock participants.",
      createdAt: "10:16 AM",
    },
    {
      id: "msg-4",
      role: "assistant",
      content:
        "Updated the preview: target is 5 SOL, current total is 3.2 SOL (64%), and four participants are listed with their contributions.",
      createdAt: "10:17 AM",
    },
  ],
  "app-tips": [
    {
      id: "msg-tips-1",
      role: "user",
      content: "Create a tip jar for our creator collective.",
      createdAt: "Yesterday",
    },
    {
      id: "msg-tips-2",
      role: "assistant",
      content:
        "Draft started. Add more product details when you are ready to generate the first preview.",
      createdAt: "Yesterday",
    },
  ],
  "app-split": [
    {
      id: "msg-split-1",
      role: "user",
      content: "Help us track shared rent and settle in SOL.",
      createdAt: "9:02 AM",
    },
    {
      id: "msg-split-2",
      role: "assistant",
      content: "Generating the first layout for Rent Split…",
      createdAt: "9:03 AM",
    },
  ],
}

export const statusLabel: Record<AppStatus, string> = {
  ready: "Ready",
  generating: "Generating",
  draft: "Draft",
}
