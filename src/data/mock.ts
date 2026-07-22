export type MockApp = {
  id: string
  name: string
  initials: string
  lastActivity: string
  timestamp: string
  unread?: number
}

export type MessageRole = "user" | "member" | "assistant"

export type MockMessage = {
  id: string
  role: MessageRole
  author: string
  initials: string
  content: string
  createdAt: string
}

export type MockUser = {
  name: string
  initials: string
}

export type MockMember = {
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
    name: "Squad Pool",
    initials: "SP",
    lastActivity: "Jordan: Just added 0.5 SOL 🙌",
    timestamp: "2m",
    unread: 2,
  },
  {
    id: "app-tips",
    name: "Creator Tips",
    initials: "CT",
    lastActivity: "SolBuilder: Draft tip jar is ready",
    timestamp: "1h",
  },
  {
    id: "app-split",
    name: "Rent Split",
    initials: "RS",
    lastActivity: "Priya: Can we settle this week?",
    timestamp: "Yesterday",
    unread: 1,
  },
  {
    id: "app-trip",
    name: "Trip Fund",
    initials: "TF",
    lastActivity: "You: Let's bump the goal to 8 SOL",
    timestamp: "Mon",
  },
]

export const mockMembersByAppId: Record<string, MockMember[]> = {
  "app-pool": [
    { name: "Maya Chen", initials: "MC" },
    { name: "Jordan Lee", initials: "JL" },
    { name: "Priya Shah", initials: "PS" },
    { name: "Alex Kim", initials: "AK" },
  ],
  "app-tips": [
    { name: "Maya Chen", initials: "MC" },
    { name: "Sam Rivera", initials: "SR" },
    { name: "Nova Blake", initials: "NB" },
  ],
  "app-split": [
    { name: "Maya Chen", initials: "MC" },
    { name: "Priya Shah", initials: "PS" },
    { name: "Chris Ong", initials: "CO" },
  ],
  "app-trip": [
    { name: "Maya Chen", initials: "MC" },
    { name: "Jordan Lee", initials: "JL" },
    { name: "Alex Kim", initials: "AK" },
  ],
}

export const mockMessagesByAppId: Record<string, MockMessage[]> = {
  "app-pool": [
    {
      id: "msg-1",
      role: "assistant",
      author: "SolBuilder",
      initials: "SB",
      content:
        "Squad Pool is live. Progress meter, members, and Contribute are ready — wallet stays off for now.",
      createdAt: "10:14 AM",
    },
    {
      id: "msg-2",
      role: "member",
      author: "Jordan Lee",
      initials: "JL",
      content: "Love this. Target still 5 SOL?",
      createdAt: "10:16 AM",
    },
    {
      id: "msg-3",
      role: "user",
      author: "Maya Chen",
      initials: "MC",
      content: "Yep — let's keep it at 5 for the weekend trip.",
      createdAt: "10:17 AM",
    },
    {
      id: "msg-4",
      role: "member",
      author: "Priya Shah",
      initials: "PS",
      content: "I can put in 0.7 tonight.",
      createdAt: "10:19 AM",
    },
    {
      id: "msg-5",
      role: "member",
      author: "Jordan Lee",
      initials: "JL",
      content: "Just added 0.5 SOL 🙌",
      createdAt: "2m",
    },
    {
      id: "msg-6",
      role: "assistant",
      author: "SolBuilder",
      initials: "SB",
      content: "Pool updated: 3.2 / 5 SOL funded.",
      createdAt: "2m",
    },
  ],
  "app-tips": [
    {
      id: "msg-tips-1",
      role: "user",
      author: "Maya Chen",
      initials: "MC",
      content: "Can we make a shared tip jar for the collective?",
      createdAt: "Yesterday",
    },
    {
      id: "msg-tips-2",
      role: "assistant",
      author: "SolBuilder",
      initials: "SB",
      content: "Draft tip jar is ready. Open the app to review the layout.",
      createdAt: "Yesterday",
    },
    {
      id: "msg-tips-3",
      role: "member",
      author: "Sam Rivera",
      initials: "SR",
      content: "Nice — can we show top tippers?",
      createdAt: "1h",
    },
  ],
  "app-split": [
    {
      id: "msg-split-1",
      role: "member",
      author: "Priya Shah",
      initials: "PS",
      content: "Can we settle this week?",
      createdAt: "Yesterday",
    },
    {
      id: "msg-split-2",
      role: "user",
      author: "Maya Chen",
      initials: "MC",
      content: "Yeah — SolBuilder, track shared rent and mark who paid.",
      createdAt: "Yesterday",
    },
    {
      id: "msg-split-3",
      role: "assistant",
      author: "SolBuilder",
      initials: "SB",
      content: "Rent Split draft is up. Open the app to check balances.",
      createdAt: "Yesterday",
    },
  ],
  "app-trip": [
    {
      id: "msg-trip-1",
      role: "user",
      author: "Maya Chen",
      initials: "MC",
      content: "Let's bump the goal to 8 SOL",
      createdAt: "Mon",
    },
    {
      id: "msg-trip-2",
      role: "assistant",
      author: "SolBuilder",
      initials: "SB",
      content: "Updated Trip Fund goal to 8 SOL.",
      createdAt: "Mon",
    },
    {
      id: "msg-trip-3",
      role: "member",
      author: "Alex Kim",
      initials: "AK",
      content: "I can cover gas if we hit it.",
      createdAt: "Mon",
    },
  ],
}
